import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  behaviorEvent,
  characterType,
  consentRecord,
  message,
  messageRead,
  notification,
  notificationPreference,
  parentStudent,
  schoolClass,
  stage,
  student,
  studentProgress,
  subject,
  topic,
  user,
} from "@/server/db/schema";
import { formatStudentName } from "@/lib/student-names";
import { visibleToParent } from "./message";

// KVKK data export (JSON for everything, CSV for the behavior history). A parent's export holds
// only what the parent can already see: no teacher notes, no who-gave-the-score, no other child.

const SOURCE_LABEL = { school: "Okul", home: "Ev" } as const;

function omit<T extends object, K extends keyof T>(row: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...row };
  for (const key of keys) delete copy[key];
  return copy;
}

async function childRecords(db: Db, studentIds: string[], opts: { withNotes: boolean }) {
  if (studentIds.length === 0) return { events: [], progress: [] };
  const [events, progress] = await Promise.all([
    db
      .select({
        studentId: behaviorEvent.studentId,
        createdAt: behaviorEvent.createdAt,
        source: behaviorEvent.source,
        behavior: behaviorEvent.nameSnapshot,
        icon: behaviorEvent.iconSnapshot,
        points: behaviorEvent.pointsSnapshot,
        xp: behaviorEvent.xpDelta,
        note: behaviorEvent.note,
      })
      .from(behaviorEvent)
      .where(and(inArray(behaviorEvent.studentId, studentIds), isNull(behaviorEvent.deletedAt)))
      .orderBy(asc(behaviorEvent.createdAt)),
    db
      .select({
        studentId: studentProgress.studentId,
        subject: subject.name,
        topic: topic.name,
        stage: stage.name,
        status: studentProgress.status,
        stars: studentProgress.stars,
        updatedAt: studentProgress.updatedAt,
      })
      .from(studentProgress)
      .innerJoin(stage, eq(stage.id, studentProgress.stageId))
      .innerJoin(topic, eq(topic.id, stage.topicId))
      .innerJoin(subject, eq(subject.id, topic.subjectId))
      .where(inArray(studentProgress.studentId, studentIds))
      .orderBy(asc(subject.sortOrder), asc(topic.sortOrder), asc(stage.sortOrder)),
  ]);
  return {
    events: events.map((e) => ({ ...omit(e, "note"), source: SOURCE_LABEL[e.source], ...(opts.withNotes && { note: e.note }) })),
    progress,
  };
}

const studentColumns = {
  id: student.id,
  firstName: student.firstName,
  lastInitial: student.lastInitial,
  gradeLevel: student.gradeLevel,
  className: schoolClass.name,
  classId: student.classId,
  character: characterType.name,
  level: student.characterLevel,
  xp: student.xp,
  balance: student.balance,
  active: student.active,
  createdAt: student.createdAt,
};

/** Everything about the parent and their linked children. Scoped by parent_student (rule 3). */
export async function exportParentData(db: Db, parentId: string) {
  const [account] = await db
    .select({ name: user.name, email: user.email, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, parentId));

  const children = await db
    .select({ ...studentColumns, relation: parentStudent.relation, linkedAt: parentStudent.createdAt })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .innerJoin(characterType, eq(characterType.id, student.characterTypeId))
    .where(and(eq(parentStudent.parentId, parentId), isNull(student.deletedAt)))
    .orderBy(asc(student.firstName));
  const ids = children.map((c) => c.id);

  const [records, messages, consents, preferences, notifications] = await Promise.all([
    childRecords(db, ids, { withNotes: false }),
    db
      .select({
        studentId: message.studentId,
        classId: message.classId,
        title: message.title,
        body: message.body,
        createdAt: message.createdAt,
        readAt: messageRead.readAt,
        reaction: messageRead.reaction,
      })
      .from(message)
      .leftJoin(messageRead, and(eq(messageRead.messageId, message.id), eq(messageRead.parentId, parentId)))
      .where(visibleToParent(parentId))
      .orderBy(asc(message.createdAt)),
    db
      .select({
        studentId: consentRecord.studentId,
        kind: consentRecord.kind,
        docVersion: consentRecord.docVersion,
        acceptedAt: consentRecord.acceptedAt,
        withdrawnAt: consentRecord.withdrawnAt,
        ip: consentRecord.ip,
      })
      .from(consentRecord)
      .where(eq(consentRecord.userId, parentId))
      .orderBy(asc(consentRecord.acceptedAt)),
    db
      .select({ type: notificationPreference.type, enabled: notificationPreference.enabled })
      .from(notificationPreference)
      .where(eq(notificationPreference.userId, parentId)),
    db
      .select({ type: notification.type, payload: notification.payload, createdAt: notification.createdAt, readAt: notification.readAt })
      .from(notification)
      .where(eq(notification.userId, parentId))
      .orderBy(desc(notification.createdAt)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account,
    consents,
    notificationPreferences: preferences,
    notifications,
    children: children.map((c) => ({
      ...omit(c, "firstName", "lastInitial", "classId"),
      name: formatStudentName(c),
      behaviorEvents: records.events.filter((e) => e.studentId === c.id).map((e) => omit(e, "studentId")),
      progress: records.progress.filter((p) => p.studentId === c.id).map((p) => omit(p, "studentId")),
      messages: messages
        .filter((m) => m.studentId === c.id || (m.studentId === null && m.classId === c.classId))
        .map((m) => ({ ...omit(m, "studentId", "classId"), kind: m.studentId ? "Özel mesaj" : "Sınıf duyurusu" })),
    })),
  };
}

/**
 * One student's full record for a school admin handling a KVKK request: includes teacher
 * notes, linked parents and consents. Call only after assertAdminOfStudent.
 */
export async function exportStudentData(db: Db, studentId: string) {
  const [child] = await db
    .select(studentColumns)
    .from(student)
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .innerJoin(characterType, eq(characterType.id, student.characterTypeId))
    .where(eq(student.id, studentId));
  if (!child) return null;

  const [records, parents, messages, consents] = await Promise.all([
    childRecords(db, [studentId], { withNotes: true }),
    db
      .select({ name: user.name, email: user.email, relation: parentStudent.relation, linkedAt: parentStudent.createdAt })
      .from(parentStudent)
      .innerJoin(user, eq(user.id, parentStudent.parentId))
      .where(eq(parentStudent.studentId, studentId)),
    db
      .select({ title: message.title, body: message.body, createdAt: message.createdAt })
      .from(message)
      .where(and(eq(message.studentId, studentId), isNull(message.deletedAt)))
      .orderBy(asc(message.createdAt)),
    db
      .select({ kind: consentRecord.kind, docVersion: consentRecord.docVersion, acceptedAt: consentRecord.acceptedAt, withdrawnAt: consentRecord.withdrawnAt })
      .from(consentRecord)
      .where(eq(consentRecord.studentId, studentId)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    student: { ...omit(child, "firstName", "lastInitial", "classId"), name: formatStudentName(child) },
    parents,
    consents,
    behaviorEvents: records.events.map((e) => omit(e, "studentId")),
    progress: records.progress.map((p) => omit(p, "studentId")),
    messages,
  };
}

type CsvEvent = { createdAt: Date; source: string; behavior: string; points: number; xp: number; note?: string | null };

function csvCell(value: string | number) {
  const text = String(value);
  // Quote when needed; a leading =,+,-,@ would run as a formula in Excel.
  const safe = /^[=+\-@]/.test(text) && typeof value === "string" ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Behavior history as CSV for Excel in Turkish locale: ";" separator, UTF-8 BOM. */
export function behaviorEventsCsv(rows: { child: string; events: CsvEvent[] }[], timeZone = "Europe/Istanbul") {
  const withNotes = rows.some((r) => r.events.some((e) => e.note !== undefined));
  const header = ["Tarih", "Çocuk", "Kaynak", "Davranış", "Puan", "XP", ...(withNotes ? ["Not"] : [])];
  const format = new Intl.DateTimeFormat("tr-TR", { timeZone, dateStyle: "short", timeStyle: "short" });
  const lines = rows.flatMap(({ child, events }) =>
    events.map((e) =>
      [format.format(e.createdAt), child, e.source, e.behavior, e.points, e.xp, ...(withNotes ? [e.note ?? ""] : [])]
        .map(csvCell)
        .join(";"),
    ),
  );
  return "﻿" + [header.join(";"), ...lines].join("\r\n") + "\r\n";
}
