import { randomUUID } from "node:crypto";
import { eq, getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import {
  auditLog,
  behaviorEvent,
  consentRecord,
  deletionRequest,
  message,
  notification,
  parentStudent,
  student,
  user,
} from "@/server/db/schema";
import { assertAdminOfDeletionRequest, assertAdminOfStudent } from "@/server/auth/guards";
import { createCredentialUser, verifyUserPassword } from "@/server/auth/users";
import { listAuditLog, writeAudit } from "@/server/services/audit";
import { behaviorEventsCsv, exportParentData, exportStudentData } from "@/server/services/export";
import {
  completeDeletionRequest,
  deleteParentAccount,
  listDeletionRequests,
  listPendingRequestsForParent,
  rejectDeletionRequest,
  requestChildDeletion,
} from "@/server/services/privacy";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { code: "FORBIDDEN" };

// Fixture: parent A → studentA1 ("Ada", class A) and studentB1 ("Can", class B);
// parent B → studentA2 ("Ali", class A). Each test gets fresh schools and users.
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

beforeEach(async () => {
  const tables = Object.values(schema).flatMap((v) => (is(v, PgTable) ? [`"${getTableName(v)}"`] : []));
  await db.execute(sql.raw(`TRUNCATE ${tables.join(", ")} CASCADE`));
  fx = await seedAuthFixture(db);
});

/** Events, a private message, a notification, consents and audit rows that name the child. */
async function addChildRecords(studentId: string, classId: string, parentId: string, firstName: string) {
  await db.insert(behaviorEvent).values({
    studentId,
    classId,
    nameSnapshot: "Yardımlaştı",
    iconSnapshot: "🤝",
    pointsSnapshot: 1,
    xpDelta: 1,
    balanceDelta: 1,
    source: "school",
    note: `${firstName} için öğretmen notu`,
    givenById: fx.users.teacherA.id,
    batchId: randomUUID(),
  });
  const [msg] = await db
    .insert(message)
    .values({ classId, studentId, authorId: fx.users.teacherA.id, title: `${firstName}'nın sunumu`, body: "Tebrikler" })
    .returning();
  await db.insert(notification).values({
    userId: parentId,
    type: "positive_behavior",
    payload: { studentId, title: `${firstName} puan kazandı`, body: "Yardımlaştı" },
    url: `/veli/${studentId}`,
  });
  await db.insert(consentRecord).values({ userId: parentId, studentId, kind: "explicit_consent", docVersion: "1", ip: "10.0.0.1" });
  await writeAudit(db, {
    action: "student.update",
    entity: "student",
    entityId: studentId,
    actorId: fx.users.teacherA.id,
    schoolId: fx.school1.id,
    data: { firstName, active: true },
    ip: "10.0.0.2",
  });
  await writeAudit(db, {
    action: "message.create",
    entity: "message",
    entityId: msg!.id,
    actorId: fx.users.teacherA.id,
    schoolId: fx.school1.id,
    data: { classId, studentId, title: msg!.title, recipients: 1 },
  });
  await writeAudit(db, {
    action: "behavior.give",
    entity: "behavior_event",
    entityId: randomUUID(),
    actorId: fx.users.teacherA.id,
    schoolId: fx.school1.id,
    data: { points: 1, studentIds: [studentId] },
  });
  await writeAudit(db, {
    action: "parent.link",
    entity: "parent_student",
    entityId: `${parentId}:${studentId}`,
    actorId: parentId,
    schoolId: fx.school1.id,
    data: { relation: "mother" },
    ip: "10.0.0.3",
  });
  return msg!;
}

async function auditFor(entityId: string) {
  return db.select().from(auditLog).where(eq(auditLog.entityId, entityId));
}

describe("silme talebi", () => {
  it("a parent can request deletion of their own child; a second request is a no-op", async () => {
    const first = await requestChildDeletion(db, fx.users.parentA.id, fx.students.studentA1.id, null);
    const second = await requestChildDeletion(db, fx.users.parentA.id, fx.students.studentA1.id, null);
    expect(first).toEqual({ created: true });
    expect(second).toEqual({ created: false });

    const pending = await listPendingRequestsForParent(db, fx.users.parentA.id);
    expect([...pending.keys()]).toEqual([fx.students.studentA1.id]);
  });

  it("veli A, öğrenci B için silme talebi oluşturamaz", async () => {
    await expect(requestChildDeletion(db, fx.users.parentA.id, fx.students.studentA2.id, null)).rejects.toMatchObject(FORBIDDEN);
    // Nor for a soft-deleted child that is still linked.
    await expect(requestChildDeletion(db, fx.users.parentA.id, fx.students.deletedStudent.id, null)).rejects.toMatchObject(
      FORBIDDEN,
    );
    expect(await db.select().from(deletionRequest)).toHaveLength(0);
  });

  it("parent B does not see parent A's pending requests", async () => {
    await requestChildDeletion(db, fx.users.parentA.id, fx.students.studentA1.id, null);
    expect((await listPendingRequestsForParent(db, fx.users.parentB.id)).size).toBe(0);
  });

  it("only an admin of the child's school may handle the request or the student", async () => {
    await requestChildDeletion(db, fx.users.parentA.id, fx.students.studentA1.id, null);
    const [request] = await db.select().from(deletionRequest);

    await expect(assertAdminOfDeletionRequest(fx.users.admin1, request!.id)).resolves.toBeUndefined();
    await expect(assertAdminOfStudent(fx.users.admin1, fx.students.studentA1.id)).resolves.toBeUndefined();
    for (const other of [fx.users.admin2, fx.users.teacherA, fx.users.parentA]) {
      await expect(assertAdminOfDeletionRequest(other, request!.id)).rejects.toMatchObject(FORBIDDEN);
      await expect(assertAdminOfStudent(other, fx.students.studentA1.id)).rejects.toMatchObject(FORBIDDEN);
    }
    expect(await listDeletionRequests(db, fx.school2.id, "pending")).toEqual([]);
  });
});

describe("öğrenci verisinin silinmesi", () => {
  it("hard-deletes the child and everything tied to them, and scrubs personal data from audit rows", async () => {
    const { studentA1, studentA2 } = fx.students;
    const msg = await addChildRecords(studentA1.id, fx.classes.classA.id, fx.users.parentA.id, "Ada");
    await addChildRecords(studentA2.id, fx.classes.classA.id, fx.users.parentB.id, "Ali");
    await requestChildDeletion(db, fx.users.parentA.id, studentA1.id, "Lütfen silin");
    const [request] = await listDeletionRequests(db, fx.school1.id, "pending");
    expect(request).toMatchObject({ firstName: "Ada", className: "2-A", requestedByEmail: "parentA@test" });

    await completeDeletionRequest(db, fx.users.admin1, request!.id, "10.0.0.9");

    expect(await db.select().from(student).where(eq(student.id, studentA1.id))).toEqual([]);
    expect(await db.select().from(behaviorEvent).where(eq(behaviorEvent.studentId, studentA1.id))).toEqual([]);
    expect(await db.select().from(parentStudent).where(eq(parentStudent.studentId, studentA1.id))).toEqual([]);
    expect(await db.select().from(message).where(eq(message.id, msg.id))).toEqual([]);
    const notifications = await db.select().from(notification).where(eq(notification.userId, fx.users.parentA.id));
    expect(JSON.stringify(notifications)).not.toContain("Ada");

    // Consent stays as proof, without the link to the child.
    const consents = await db.select().from(consentRecord).where(eq(consentRecord.userId, fx.users.parentA.id));
    expect(consents).toHaveLength(1);
    expect(consents[0]!.studentId).toBeNull();

    // Audit rows remain but no longer name the child.
    const audit = await db.select().from(auditLog).where(eq(auditLog.schoolId, fx.school1.id));
    const aboutAda = audit.filter((a) => JSON.stringify(a).includes(studentA1.id) || a.entityId === msg.id);
    expect(aboutAda.length).toBeGreaterThanOrEqual(5);
    expect(JSON.stringify(aboutAda)).not.toMatch(/Ada/);
    expect(aboutAda.find((a) => a.action === "student.delete")).toMatchObject({ actorId: fx.users.admin1.id, ip: "10.0.0.9" });

    const [done] = await db.select().from(deletionRequest).where(eq(deletionRequest.id, request!.id));
    expect(done).toMatchObject({ status: "completed", studentId: null, resolvedById: fx.users.admin1.id });
  });

  it("leaves other children untouched", async () => {
    const { studentA1, studentA2 } = fx.students;
    await addChildRecords(studentA1.id, fx.classes.classA.id, fx.users.parentA.id, "Ada");
    await addChildRecords(studentA2.id, fx.classes.classA.id, fx.users.parentB.id, "Ali");
    await requestChildDeletion(db, fx.users.parentA.id, studentA1.id, null);
    const [request] = await listDeletionRequests(db, fx.school1.id, "pending");
    await completeDeletionRequest(db, fx.users.admin1, request!.id);

    expect(await db.select().from(behaviorEvent).where(eq(behaviorEvent.studentId, studentA2.id))).toHaveLength(1);
    const [update] = (await auditFor(studentA2.id)).filter((a) => a.action === "student.update");
    expect(update!.data).toMatchObject({ firstName: "Ali" });
    // Parent A keeps their account and their other child.
    expect(await db.select().from(parentStudent).where(eq(parentStudent.parentId, fx.users.parentA.id))).toHaveLength(2);
  });

  it("a handled request cannot be handled again", async () => {
    await requestChildDeletion(db, fx.users.parentA.id, fx.students.studentA1.id, null);
    const [request] = await listDeletionRequests(db, fx.school1.id, "pending");
    await completeDeletionRequest(db, fx.users.admin1, request!.id);
    await expect(completeDeletionRequest(db, fx.users.admin1, request!.id)).rejects.toThrow("zaten sonuçlandırılmış");
    await expect(rejectDeletionRequest(db, fx.users.admin1, request!.id, "x")).rejects.toThrow("zaten sonuçlandırılmış");
  });

  it("rejecting keeps the child and records the reason", async () => {
    await requestChildDeletion(db, fx.users.parentA.id, fx.students.studentA1.id, null);
    const [request] = await listDeletionRequests(db, fx.school1.id, "pending");
    await rejectDeletionRequest(db, fx.users.admin1, request!.id, "Yasal saklama süresi");

    expect(await db.select().from(student).where(eq(student.id, fx.students.studentA1.id))).toHaveLength(1);
    const [rejected] = await listDeletionRequests(db, fx.school1.id, "rejected");
    expect(rejected).toMatchObject({ rejectReason: "Yasal saklama süresi" });
    // A new request is possible after a rejection.
    expect(await requestChildDeletion(db, fx.users.parentA.id, fx.students.studentA1.id, null)).toEqual({ created: true });
  });
});

describe("veli hesabının silinmesi", () => {
  it("deletes the account, keeps consent as unlinked proof and the child's school records", async () => {
    const { parentB } = fx.users;
    await addChildRecords(fx.students.studentA2.id, fx.classes.classA.id, parentB.id, "Ali");

    await deleteParentAccount(db, parentB.id);

    expect(await db.select().from(user).where(eq(user.id, parentB.id))).toEqual([]);
    expect(await db.select().from(parentStudent).where(eq(parentStudent.parentId, parentB.id))).toEqual([]);
    expect(await db.select().from(notification).where(eq(notification.userId, parentB.id))).toEqual([]);
    const consents = await db.select().from(consentRecord).where(eq(consentRecord.studentId, fx.students.studentA2.id));
    expect(consents).toHaveLength(1);
    expect(consents[0]).toMatchObject({ userId: null });
    expect(consents[0]!.withdrawnAt).toBeInstanceOf(Date);

    expect(await db.select().from(student).where(eq(student.id, fx.students.studentA2.id))).toHaveLength(1);
    const [link] = await auditFor(`${parentB.id}:${fx.students.studentA2.id}`);
    expect(link).toMatchObject({ actorId: null, ip: null });
    const [deleted] = await auditFor(parentB.id);
    expect(deleted).toMatchObject({ action: "user.delete", actorId: null, schoolId: fx.school1.id });
    expect(JSON.stringify(deleted)).not.toContain("parentB@test");
  });

  it("can ask for the children's deletion in the same step", async () => {
    await deleteParentAccount(db, fx.users.parentB.id, { requestDeletionOf: [fx.students.studentA2.id] });
    const [request] = await listDeletionRequests(db, fx.school1.id, "pending");
    expect(request).toMatchObject({ studentId: fx.students.studentA2.id, requestedByName: null });
  });

  it("cannot ask for another family's child, and nothing is deleted then", async () => {
    await expect(
      deleteParentAccount(db, fx.users.parentB.id, { requestDeletionOf: [fx.students.studentA1.id] }),
    ).rejects.toMatchObject(FORBIDDEN);
    expect(await db.select().from(user).where(eq(user.id, fx.users.parentB.id))).toHaveLength(1);
    expect(await db.select().from(deletionRequest)).toEqual([]);
  });

  it("is only for parents", async () => {
    await expect(deleteParentAccount(db, fx.users.teacherA.id)).rejects.toMatchObject(FORBIDDEN);
    expect(await db.select().from(user).where(eq(user.id, fx.users.teacherA.id))).toHaveLength(1);
  });
});

describe("veri dışa aktarma", () => {
  it("parent export holds only their own children and nothing the parent cannot see", async () => {
    await addChildRecords(fx.students.studentA1.id, fx.classes.classA.id, fx.users.parentA.id, "Ada");
    await addChildRecords(fx.students.studentA2.id, fx.classes.classA.id, fx.users.parentB.id, "Ali");
    await db.insert(message).values({ classId: fx.classes.classA.id, title: "Sınıf gezisi", body: "Cuma" });

    const data = await exportParentData(db, fx.users.parentA.id);

    expect(data.account).toMatchObject({ email: "parentA@test" });
    expect(data.children.map((c) => c.name).sort()).toEqual(["Ada", "Can"]);
    const ada = data.children.find((c) => c.name === "Ada")!;
    expect(ada.behaviorEvents).toHaveLength(1);
    expect(ada.messages.map((m) => m.title).sort()).toEqual(["Ada'nın sunumu", "Sınıf gezisi"]);
    const serialized = JSON.stringify(data);
    // No classmate, no soft-deleted child, no teacher note, no internal ids of other users.
    expect(serialized).not.toContain("Ali");
    expect(serialized).not.toContain("Ece");
    expect(serialized).not.toContain("öğretmen notu");
    expect(serialized).not.toContain(fx.users.teacherA.id);
  });

  it("admin export of one student includes notes and linked parents", async () => {
    await addChildRecords(fx.students.studentA1.id, fx.classes.classA.id, fx.users.parentA.id, "Ada");
    const data = await exportStudentData(db, fx.students.studentA1.id);
    expect(data?.student).toMatchObject({ name: "Ada", className: "2-A" });
    expect(data?.behaviorEvents[0]).toMatchObject({ note: "Ada için öğretmen notu", source: "Okul" });
    expect(data?.parents.map((p) => p.email)).toEqual(["parentA@test"]);
    expect(JSON.stringify(data)).not.toContain("Ali");
  });

  it("CSV is Excel-friendly and neutralizes formulas", () => {
    const csv = behaviorEventsCsv([
      {
        child: "Ada Y.",
        events: [{ createdAt: new Date("2026-09-28T09:30:00Z"), source: "Okul", behavior: "=HYPERLINK(1)", points: 1, xp: 1 }],
      },
      { child: "Can; B.", events: [{ createdAt: new Date("2026-09-28T10:00:00Z"), source: "Ev", behavior: "Kitap", points: -1, xp: 0 }] },
    ]);
    expect(csv.startsWith("﻿Tarih;Çocuk;Kaynak;Davranış;Puan;XP\r\n")).toBe(true);
    expect(csv).toContain("28.09.2026 12:30;Ada Y.;Okul;'=HYPERLINK(1);1;1");
    expect(csv).toContain('"Can; B."');
    // Negative numbers are numbers, not formulas.
    expect(csv).toContain(";-1;0");
  });
});

describe("denetim kaydı", () => {
  it("lists only the admin's school and filters by action and actor", async () => {
    await writeAudit(db, { action: "class.create", entity: "class", entityId: "c1", actorId: fx.users.teacherA.id, schoolId: fx.school1.id });
    await writeAudit(db, { action: "class.update", entity: "class", entityId: "c1", actorId: fx.users.teacherB.id, schoolId: fx.school1.id });
    await writeAudit(db, { action: "class.create", entity: "class", entityId: "c2", actorId: fx.users.admin2.id, schoolId: fx.school2.id });

    const all = await listAuditLog(db, fx.school1.id);
    expect(all.rows.map((r) => r.entityId)).toEqual(["c1", "c1"]);
    expect((await listAuditLog(db, fx.school1.id, { action: "class.create" })).rows).toHaveLength(1);
    const byActor = await listAuditLog(db, fx.school1.id, { actor: "TEACHERB" });
    expect(byActor.rows).toMatchObject([{ action: "class.update", actorEmail: "teacherB@test" }]);
    // LIKE wildcards in the search are literal.
    expect((await listAuditLog(db, fx.school1.id, { actor: "%" })).rows).toEqual([]);
    expect((await listAuditLog(db, fx.school1.id, { actor: "_" })).rows).toEqual([]);
    expect((await listAuditLog(db, fx.school1.id, { from: new Date(Date.now() + 60_000) })).rows).toEqual([]);
  });
});

describe("şifre doğrulama", () => {
  it("accepts the right password only", async () => {
    const created = await db.transaction((tx) =>
      createCredentialUser(tx, { email: "p@test", name: "P", password: "Sifre1234!", role: "parent" }),
    );
    expect(await verifyUserPassword(db, created.id, "Sifre1234!")).toBe(true);
    expect(await verifyUserPassword(db, created.id, "yanlis-sifre")).toBe(false);
    expect(await verifyUserPassword(db, fx.users.parentA.id, "Sifre1234!")).toBe(false);
  });
});
