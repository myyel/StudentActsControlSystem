import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db, DbOrTx } from "@/server/db";
import {
  message,
  messageRead,
  parentStudent,
  schoolClass,
  student,
  user,
  type MessageReaction,
} from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import { formatStudentName } from "@/lib/student-names";
import type { MessageInput } from "@/server/validation/message";
import { writeAudit } from "./audit";
import { createNotifications, markMessageNotificationsRead, removeMessageNotifications } from "./notification";

export const MESSAGE_PAGE = 50;
const PREVIEW_LENGTH = 140;

export const messageUrl = (messageId: string) => `/veli/mesajlar/${messageId}`;

const preview = (text: string) =>
  text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…` : text;

/**
 * A parent sees a message when one of their (non-deleted) children is its student, or, for a
 * class announcement, is in its class. Recipients are resolved now, not at send time, so a
 * parent who links later sees older messages too (PRD §4.8). Always goes through parent_student.
 */
// Aliases keep the subquery apart from the outer query's own student join.
const ps = alias(parentStudent, "vis_ps");
const child = alias(student, "vis_child");

export function visibleToParent(parentId: string, studentId?: string): SQL {
  return sql`${message.deletedAt} is null and exists (
    select 1 from ${parentStudent} "vis_ps"
    inner join ${student} "vis_child" on ${child.id} = ${ps.studentId}
    where ${ps.parentId} = ${parentId}
      and ${child.deletedAt} is null
      ${studentId ? sql`and ${child.id} = ${studentId}` : sql``}
      and (${message.studentId} = ${child.id}
        or (${message.studentId} is null and ${child.classId} = ${message.classId}))
  )`;
}

/** Current parents of a class (all non-deleted students) or of one student, with their children. */
async function recipientsOf(db: DbOrTx, classId: string, studentId: string | null) {
  return db
    .select({
      parentId: parentStudent.parentId,
      parentName: user.name,
      studentId: student.id,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
    })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .innerJoin(user, eq(user.id, parentStudent.parentId))
    .where(
      and(
        eq(student.classId, classId),
        isNull(student.deletedAt),
        studentId ? eq(student.id, studentId) : undefined,
      ),
    );
}

/**
 * Sends a class announcement or a message to one student's parents, and notifies them.
 * Call only after assertTeacherOfClass.
 */
export async function sendMessage(db: Db, actor: AuthUser, classId: string, input: MessageInput, ip?: string | null) {
  return db.transaction(async (tx) => {
    const [cls] = await tx
      .select({ name: schoolClass.name, schoolId: schoolClass.schoolId })
      .from(schoolClass)
      .where(eq(schoolClass.id, classId));
    if (!cls) throw forbidden();

    let studentName: string | null = null;
    if (input.studentId) {
      const [row] = await tx
        .select({ firstName: student.firstName, lastInitial: student.lastInitial })
        .from(student)
        .where(and(eq(student.id, input.studentId), eq(student.classId, classId), isNull(student.deletedAt)));
      if (!row) throw forbidden();
      studentName = formatStudentName(row);
    }

    const [created] = await tx
      .insert(message)
      .values({ classId, studentId: input.studentId, authorId: actor.id, title: input.title, body: input.body })
      .returning({ id: message.id });
    const messageId = created!.id;

    const parentIds = [...new Set((await recipientsOf(tx, classId, input.studentId)).map((r) => r.parentId))];
    const notificationIds = await createNotifications(
      tx,
      parentIds.map((userId) => ({
        userId,
        type: "message" as const,
        url: messageUrl(messageId),
        payload: {
          messageId,
          ...(input.studentId && { studentId: input.studentId, studentName: studentName! }),
          title: `${studentName ?? cls.name} · ${input.title}`,
          body: preview(input.body),
        },
      })),
    );

    await writeAudit(tx, {
      action: "message.create",
      entity: "message",
      entityId: messageId,
      actorId: actor.id,
      schoolId: cls.schoolId,
      data: { classId, studentId: input.studentId, title: input.title, recipients: parentIds.length },
      ip,
    });

    return { messageId, notificationIds };
  });
}

/** The class of a message, so callers can run assertTeacherOfClass. */
export async function getMessageClassId(db: Db, messageId: string) {
  const [row] = await db.select({ classId: message.classId }).from(message).where(eq(message.id, messageId));
  if (!row) throw forbidden();
  return row.classId;
}

/** Soft delete; parents stop seeing it and its notifications go away. Call only after assertTeacherOfClass. */
export async function deleteMessage(db: Db, actor: AuthUser, messageId: string, ip?: string | null) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        classId: message.classId,
        studentId: message.studentId,
        title: message.title,
        deletedAt: message.deletedAt,
        schoolId: schoolClass.schoolId,
      })
      .from(message)
      .innerJoin(schoolClass, eq(schoolClass.id, message.classId))
      .where(eq(message.id, messageId))
      .for("update", { of: message });
    if (!row) throw forbidden();
    if (row.deletedAt) return;

    await tx.update(message).set({ deletedAt: new Date() }).where(eq(message.id, messageId));
    await removeMessageNotifications(tx, messageId);
    await writeAudit(tx, {
      action: "message.delete",
      entity: "message",
      entityId: messageId,
      actorId: actor.id,
      schoolId: row.schoolId,
      data: { classId: row.classId, studentId: row.studentId, title: row.title },
      ip,
    });
  });
}

export type Reader = {
  parentId: string;
  parentName: string;
  children: string[];
  readAt: Date | null;
  reaction: MessageReaction | null;
};

/** Teacher view: messages of a class with read receipts and reactions of the current recipients. */
export async function listClassMessages(db: Db, classId: string, limit = MESSAGE_PAGE) {
  const rows = await db
    .select({
      id: message.id,
      studentId: message.studentId,
      title: message.title,
      body: message.body,
      createdAt: message.createdAt,
      authorName: user.name,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
    })
    .from(message)
    .leftJoin(student, eq(student.id, message.studentId))
    .leftJoin(user, eq(user.id, message.authorId))
    .where(and(eq(message.classId, classId), isNull(message.deletedAt)))
    .orderBy(desc(message.createdAt), desc(message.id))
    .limit(limit);
  if (rows.length === 0) return [];

  const [links, reads] = await Promise.all([
    recipientsOf(db, classId, null),
    db
      .select()
      .from(messageRead)
      .where(
        inArray(
          messageRead.messageId,
          rows.map((r) => r.id),
        ),
      ),
  ]);
  const readsByMessage = new Map<string, Map<string, (typeof reads)[number]>>();
  for (const r of reads) {
    if (!readsByMessage.has(r.messageId)) readsByMessage.set(r.messageId, new Map());
    readsByMessage.get(r.messageId)!.set(r.parentId, r);
  }

  return rows.map((m) => {
    const parents = new Map<string, Reader>();
    for (const l of links) {
      if (m.studentId && l.studentId !== m.studentId) continue;
      const read = readsByMessage.get(m.id)?.get(l.parentId);
      const reader = parents.get(l.parentId) ?? {
        parentId: l.parentId,
        parentName: l.parentName,
        children: [],
        readAt: read?.readAt ?? null,
        reaction: read?.reaction ?? null,
      };
      reader.children.push(formatStudentName(l));
      parents.set(l.parentId, reader);
    }
    const readers = [...parents.values()].sort((a, b) => a.parentName.localeCompare(b.parentName, "tr"));
    return {
      id: m.id,
      title: m.title,
      body: m.body,
      createdAt: m.createdAt,
      authorName: m.authorName,
      studentName: m.firstName ? formatStudentName({ firstName: m.firstName, lastInitial: m.lastInitial }) : null,
      readers,
      readCount: readers.filter((r) => r.readAt).length,
      reactions: {
        seen: readers.filter((r) => r.reaction === "seen").length,
        thanks: readers.filter((r) => r.reaction === "thanks").length,
      },
    };
  });
}

export type ClassMessage = Awaited<ReturnType<typeof listClassMessages>>[number];

const parentColumns = {
  id: message.id,
  title: message.title,
  body: message.body,
  createdAt: message.createdAt,
  studentId: message.studentId,
  className: schoolClass.name,
  firstName: student.firstName,
  lastInitial: student.lastInitial,
  readAt: messageRead.readAt,
  reaction: messageRead.reaction,
};

function parentMessageQuery(db: Db, parentId: string) {
  return db
    .select(parentColumns)
    .from(message)
    .innerJoin(schoolClass, eq(schoolClass.id, message.classId))
    .leftJoin(student, eq(student.id, message.studentId))
    .leftJoin(messageRead, and(eq(messageRead.messageId, message.id), eq(messageRead.parentId, parentId)));
}

const toParentMessage = ({ firstName, lastInitial, ...m }: Awaited<ReturnType<typeof parentMessageQuery>>[number]) => ({
  ...m,
  studentName: firstName ? formatStudentName({ firstName, lastInitial }) : null,
});

export type ParentMessage = ReturnType<typeof toParentMessage>;

/** Messages a parent may see, newest first; `studentId` narrows to one child's messages. */
export async function listParentMessages(
  db: Db,
  parentId: string,
  opts: { studentId?: string; unreadOnly?: boolean; limit?: number } = {},
) {
  const rows = await parentMessageQuery(db, parentId)
    .where(and(visibleToParent(parentId, opts.studentId), opts.unreadOnly ? isNull(messageRead.readAt) : undefined))
    .orderBy(desc(message.createdAt), desc(message.id))
    .limit(opts.limit ?? MESSAGE_PAGE);
  return rows.map(toParentMessage);
}

export async function getParentMessage(db: Db, parentId: string, messageId: string) {
  const [row] = await parentMessageQuery(db, parentId).where(and(eq(message.id, messageId), visibleToParent(parentId)));
  if (!row) throw forbidden();
  return toParentMessage(row);
}

export async function countUnreadMessages(db: Db, parentId: string, studentId?: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(message)
    .leftJoin(messageRead, and(eq(messageRead.messageId, message.id), eq(messageRead.parentId, parentId)))
    .where(and(visibleToParent(parentId, studentId), isNull(messageRead.readAt)));
  return row?.count ?? 0;
}

/** Read receipt; the first read time is kept. Call only after assertParentOfMessage. */
export async function markMessageRead(db: Db, parentId: string, messageId: string) {
  await db.insert(messageRead).values({ messageId, parentId }).onConflictDoNothing();
  await markMessageNotificationsRead(db, parentId, messageId);
}

/** Quick reaction (null clears it); reacting also counts as reading. Call only after assertParentOfMessage. */
export async function setMessageReaction(db: Db, parentId: string, messageId: string, reaction: MessageReaction | null) {
  await db
    .insert(messageRead)
    .values({ messageId, parentId, reaction })
    .onConflictDoUpdate({ target: [messageRead.messageId, messageRead.parentId], set: { reaction } });
  await markMessageNotificationsRead(db, parentId, messageId);
}
