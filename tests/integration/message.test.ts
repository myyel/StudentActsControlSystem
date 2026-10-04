import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { auditLog, notification, parentStudent, student, user } from "@/server/db/schema";
import { assertParentOfMessage, assertTeacherOfClass } from "@/server/auth/guards";
import {
  countUnreadMessages,
  deleteMessage,
  getMessageClassId,
  getParentMessage,
  listClassMessages,
  listParentMessages,
  markMessageRead,
  sendMessage,
  setMessageReaction,
} from "@/server/services/message";
import { countUnreadNotifications, setPreference } from "@/server/services/notification";
import { messageSchema } from "@/server/validation/message";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { code: "FORBIDDEN" };

// Fixture: parent A → studentA1 (Ada, class A), studentB1 (Can, class B), deletedStudent (class A);
// parent B → studentA2 (Ali, class A). Teacher A owns class A, teacher B class B.
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
});

const send = (classId: string, input: { title: string; body: string; studentId?: string }, teacher = fx.users.teacherA) =>
  sendMessage(db, teacher, classId, messageSchema.parse(input));

describe("messages", () => {
  it("delivers a class announcement to every parent of the class, once each", async () => {
    const { messageId, notificationIds } = await send(fx.classes.classA.id, { title: "Gezi", body: "Yarın geziye gidiyoruz." });
    // Parent A (Ada) and parent B (Ali); parent A's deleted child does not add a second one.
    expect(notificationIds).toHaveLength(2);

    const [a] = await listParentMessages(db, fx.users.parentA.id);
    expect(a).toMatchObject({ id: messageId, title: "Gezi", studentName: null, className: "2-A", readAt: null });
    expect((await listParentMessages(db, fx.users.parentB.id)).map((m) => m.id)).toContain(messageId);

    const [note] = await db.select().from(notification).where(eq(notification.userId, fx.users.parentB.id));
    expect(note).toMatchObject({ type: "message", url: `/veli/mesajlar/${messageId}` });
    expect(note!.payload.title).toBe("2-A · Gezi");

    const [audit] = await db.select().from(auditLog).where(eq(auditLog.entityId, messageId));
    expect(audit).toMatchObject({ action: "message.create", actorId: fx.users.teacherA.id });
  });

  it("delivers a student message only to that student's parents", async () => {
    const { messageId } = await send(fx.classes.classA.id, {
      title: "Ali hakkında",
      body: "Ali bugün çok iyiydi.",
      studentId: fx.students.studentA2.id,
    });
    expect((await listParentMessages(db, fx.users.parentB.id)).map((m) => m.id)).toContain(messageId);
    // Veli A, öğrenci B'nin mesajını göremez.
    expect((await listParentMessages(db, fx.users.parentA.id)).map((m) => m.id)).not.toContain(messageId);
    await expect(getParentMessage(db, fx.users.parentA.id, messageId)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertParentOfMessage(fx.users.parentA, messageId)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertParentOfMessage(fx.users.parentB, messageId)).resolves.toBeUndefined();
  });

  it("does not show another class's announcement", async () => {
    const { messageId } = await send(fx.classes.classB.id, { title: "2-B duyurusu", body: "..." }, fx.users.teacherB);
    expect((await listParentMessages(db, fx.users.parentA.id)).map((m) => m.id)).toContain(messageId);
    expect((await listParentMessages(db, fx.users.parentB.id)).map((m) => m.id)).not.toContain(messageId);
    await expect(assertParentOfMessage(fx.users.parentB, messageId)).rejects.toMatchObject(FORBIDDEN);
  });

  it("narrows a parent's list to one child", async () => {
    const forAda = await listParentMessages(db, fx.users.parentA.id, { studentId: fx.students.studentA1.id });
    expect(forAda.every((m) => m.className === "2-A")).toBe(true);
    const forCan = await listParentMessages(db, fx.users.parentA.id, { studentId: fx.students.studentB1.id });
    expect(forCan.every((m) => m.className === "2-B")).toBe(true);
    // A child id of another parent yields nothing.
    expect(await listParentMessages(db, fx.users.parentA.id, { studentId: fx.students.studentA2.id })).toEqual([]);
  });

  it("shows older messages to a parent who links later", async () => {
    const { messageId } = await send(fx.classes.classA.id, {
      title: "Eski",
      body: "Bağlanmadan önce",
      studentId: fx.students.studentA2.id,
    });
    const [late] = await db.insert(user).values({ email: "late@test", name: "Geç Veli", role: "parent" }).returning();
    const lateUser = { id: late!.id, role: late!.role };
    await expect(assertParentOfMessage(lateUser, messageId)).rejects.toMatchObject(FORBIDDEN);

    await db.insert(parentStudent).values({ parentId: late!.id, studentId: fx.students.studentA2.id });
    await expect(assertParentOfMessage(lateUser, messageId)).resolves.toBeUndefined();
    // No notification for messages sent before linking.
    expect(await countUnreadNotifications(db, late!.id)).toBe(0);
    await db.delete(parentStudent).where(eq(parentStudent.parentId, late!.id));
  });

  it("does not deliver a message about a deleted child", async () => {
    await expect(
      send(fx.classes.classA.id, { title: "x", body: "y", studentId: fx.students.deletedStudent.id }),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("does not let a teacher message another class or its students", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherA, fx.classes.classB.id)).rejects.toMatchObject(FORBIDDEN);
    // Even if a guard were skipped, a student of another class is refused.
    await expect(
      send(fx.classes.classA.id, { title: "x", body: "y", studentId: fx.students.studentB1.id }),
    ).rejects.toMatchObject(FORBIDDEN);
    const { messageId } = await send(fx.classes.classA.id, { title: "A", body: "a" });
    // Deleting and reading receipts go through the message's class.
    await expect(
      assertTeacherOfClass(fx.users.teacherB, await getMessageClassId(db, messageId)),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("records read receipts and reactions, and shows them to the teacher", async () => {
    const { messageId } = await send(fx.classes.classA.id, { title: "Okundu", body: "Deneme" });
    expect(await countUnreadNotifications(db, fx.users.parentB.id)).toBeGreaterThan(0);
    const unreadBefore = await countUnreadMessages(db, fx.users.parentB.id);

    await markMessageRead(db, fx.users.parentB.id, messageId);
    await markMessageRead(db, fx.users.parentB.id, messageId);
    await setMessageReaction(db, fx.users.parentB.id, messageId, "thanks");
    await setMessageReaction(db, fx.users.parentA.id, messageId, "seen");

    expect(await countUnreadMessages(db, fx.users.parentB.id)).toBe(unreadBefore - 1);
    const msg = await getParentMessage(db, fx.users.parentB.id, messageId);
    expect(msg.readAt).toBeInstanceOf(Date);
    expect(msg.reaction).toBe("thanks");
    // Reading the message clears its notification.
    const [n] = await db
      .select()
      .from(notification)
      .where(and(eq(notification.userId, fx.users.parentB.id), eq(notification.type, "message")));
    expect(n).toBeDefined();
    const notes = await db.select().from(notification).where(eq(notification.userId, fx.users.parentB.id));
    expect(notes.find((x) => x.payload.messageId === messageId)!.readAt).toBeInstanceOf(Date);

    const teacherView = (await listClassMessages(db, fx.classes.classA.id)).find((m) => m.id === messageId)!;
    expect(teacherView.readers.map((r) => r.parentName).sort()).toEqual(["parentA@test", "parentB@test"]);
    expect(teacherView.readCount).toBe(2);
    expect(teacherView.reactions).toEqual({ seen: 1, thanks: 1 });
    expect(teacherView.readers.find((r) => r.parentId === fx.users.parentA.id)!.children).toEqual(["Ada"]);

    await setMessageReaction(db, fx.users.parentB.id, messageId, null);
    expect((await getParentMessage(db, fx.users.parentB.id, messageId)).reaction).toBeNull();
  });

  it("lists a student message's receipts only for that student's parents", async () => {
    const { messageId } = await send(fx.classes.classA.id, {
      title: "Ada",
      body: "Ada için",
      studentId: fx.students.studentA1.id,
    });
    const view = (await listClassMessages(db, fx.classes.classA.id)).find((m) => m.id === messageId)!;
    expect(view.studentName).toBe("Ada");
    expect(view.readers.map((r) => r.parentId)).toEqual([fx.users.parentA.id]);
  });

  it("skips the notification but still shows the message when message notifications are off", async () => {
    await setPreference(db, fx.users.parentB.id, "message", false);
    const { messageId, notificationIds } = await send(fx.classes.classA.id, { title: "Sessiz", body: "..." });
    expect(notificationIds).toHaveLength(1);
    expect((await listParentMessages(db, fx.users.parentB.id)).map((m) => m.id)).toContain(messageId);
    await setPreference(db, fx.users.parentB.id, "message", true);
  });

  it("soft deletes a message, hides it from parents and removes its notifications", async () => {
    const { messageId } = await send(fx.classes.classA.id, { title: "Silinecek", body: "..." });
    await deleteMessage(db, fx.users.teacherA, messageId);
    await deleteMessage(db, fx.users.teacherA, messageId);

    await expect(assertParentOfMessage(fx.users.parentB, messageId)).rejects.toMatchObject(FORBIDDEN);
    expect((await listClassMessages(db, fx.classes.classA.id)).map((m) => m.id)).not.toContain(messageId);
    const notes = await db.select().from(notification);
    expect(notes.some((n) => n.payload.messageId === messageId)).toBe(false);
    const audits = await db.select().from(auditLog).where(and(eq(auditLog.entityId, messageId), eq(auditLog.action, "message.delete")));
    expect(audits).toHaveLength(1);
  });

  it("hides messages of a child once the child is deleted", async () => {
    const [kid] = await db
      .insert(student)
      .values({ classId: fx.classes.classA.id, firstName: "Gizem", gradeLevel: 2, characterTypeId: fx.students.studentA1.characterTypeId })
      .returning();
    await db.insert(parentStudent).values({ parentId: fx.users.parentB.id, studentId: kid!.id });
    const { messageId } = await send(fx.classes.classA.id, { title: "Gizem", body: "...", studentId: kid!.id });
    await expect(assertParentOfMessage(fx.users.parentB, messageId)).resolves.toBeUndefined();

    await db.update(student).set({ deletedAt: new Date() }).where(eq(student.id, kid!.id));
    await expect(assertParentOfMessage(fx.users.parentB, messageId)).rejects.toMatchObject(FORBIDDEN);
  });

  it("validates input", () => {
    expect(messageSchema.safeParse({ title: " ", body: "x" }).success).toBe(false);
    expect(messageSchema.safeParse({ title: "x", body: "y".repeat(2001) }).success).toBe(false);
    expect(messageSchema.parse({ title: "x", body: "y", studentId: "" }).studentId).toBeNull();
    expect(messageSchema.safeParse({ title: "x", body: "y", studentId: "nope" }).success).toBe(false);
  });
});
