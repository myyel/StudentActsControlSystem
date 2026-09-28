import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { newUuid } from "@/lib/uuid";
import { db } from "@/server/db";
import { behaviorEvent, characterLevel, notification, student } from "@/server/db/schema";
import { deleteEvent, giveBehavior, undoBatch } from "@/server/services/behavior";
import { listBehaviorTypes, loadDefaultBehaviorTypes } from "@/server/services/behavior-type";
import { giveHomeBehavior } from "@/server/services/home-behavior";
import {
  countUnreadNotifications,
  getPreferences,
  listNotifications,
  markAllNotificationsRead,
  openNotification,
  setPreference,
} from "@/server/services/notification";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { code: "FORBIDDEN" };

// Fixture: parent A → studentA1 (Ada, class A); parent B → studentA2 (Ali, class A).
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;
let types: { helped: string; interrupted: string; read: string };

beforeAll(async () => {
  fx = await seedAuthFixture(db);
  await loadDefaultBehaviorTypes(db, fx.classes.classA.id);
  const list = await listBehaviorTypes(db, fx.classes.classA.id);
  types = {
    helped: list.find((t) => t.name === "Yardımlaştı")!.id,
    interrupted: list.find((t) => t.name === "Dersi böldü")!.id,
    read: list.find((t) => t.name === "Kitap okudu")!.id,
  };
});

const give = (behaviorTypeId: string, studentIds: string[]) =>
  giveBehavior(db, fx.users.teacherA, fx.classes.classA.id, { studentIds, behaviorTypeId, note: "özel not", batchId: newUuid() });

const notesOf = (userId: string) => db.select().from(notification).where(eq(notification.userId, userId));

describe("behavior notifications", () => {
  it("notifies each student's own parents about school behaviors", async () => {
    const before = (await notesOf(fx.users.parentA.id)).length;
    const result = await give(types.helped, [fx.students.studentA1.id, fx.students.studentA2.id]);
    expect(result.notificationIds).toHaveLength(2);

    const a = (await notesOf(fx.users.parentA.id)).slice(before);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ type: "positive_behavior", url: `/veli/${fx.students.studentA1.id}` });
    expect(a[0]!.payload).toMatchObject({ studentId: fx.students.studentA1.id, studentName: "Ada", title: "Ada: 🤝 Yardımlaştı" });
    // Parent A never hears about Ali, and the teacher's note is never sent.
    expect(JSON.stringify(a)).not.toContain("Ali");
    expect(JSON.stringify(await notesOf(fx.users.parentA.id))).not.toContain("özel not");
  });

  it("uses the negative type for negative behaviors", async () => {
    await give(types.interrupted, [fx.students.studentA2.id]);
    const [last] = await listNotifications(db, fx.users.parentB.id, 1);
    expect(last!.type).toBe("negative_behavior");
    expect(last!.payload.body).toContain("−1");
  });

  it("takes the notifications back on undo and on delete", async () => {
    const undone = await give(types.helped, [fx.students.studentA1.id, fx.students.studentA2.id]);
    await undoBatch(db, fx.users.teacherA, undone.batchId);
    const all = await db.select().from(notification);
    expect(all.some((n) => n.payload.batchId === undone.batchId)).toBe(false);

    const kept = await give(types.helped, [fx.students.studentA1.id, fx.students.studentA2.id]);
    const [event] = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, kept.batchId)).limit(1);
    await deleteEvent(db, fx.users.teacherA, event!.id);
    const left = (await db.select().from(notification)).filter((n) => n.payload.batchId === kept.batchId);
    // Only the deleted event's notification is gone.
    expect(left).toHaveLength(1);
    expect(left[0]!.payload.studentId).not.toBe(event!.studentId);
  });

  it("respects preferences per type", async () => {
    expect(await getPreferences(db, fx.users.parentA.id)).toEqual({
      message: true,
      positive_behavior: true,
      negative_behavior: true,
      level_up: true,
    });
    await setPreference(db, fx.users.parentA.id, "positive_behavior", false);
    const result = await give(types.helped, [fx.students.studentA1.id, fx.students.studentA2.id]);
    // Only parent B is notified.
    expect(result.notificationIds).toHaveLength(1);
    expect((await getPreferences(db, fx.users.parentA.id)).positive_behavior).toBe(false);
    await setPreference(db, fx.users.parentA.id, "positive_behavior", true);
  });

  it("notifies about level ups", async () => {
    await db.insert(characterLevel).values(
      [0, 1000, 2000, 3000, 4000].map((xpThreshold, i) => ({ schoolId: fx.school1.id, level: i + 1, xpThreshold })),
    );
    await db.update(student).set({ xp: 999 }).where(eq(student.id, fx.students.studentA1.id));
    const result = await give(types.helped, [fx.students.studentA1.id]);
    expect(result.levelUps).toHaveLength(1);
    const levelUp = (await notesOf(fx.users.parentA.id)).find((n) => n.type === "level_up")!;
    expect(levelUp.payload.title).toBe("Ada yeni seviyeye ulaştı! 🎉");
    expect(levelUp.payload.body).toContain("2. seviye");
    // The level stays after undo, and so does its notification.
    await undoBatch(db, fx.users.teacherA, result.batchId);
    expect((await notesOf(fx.users.parentA.id)).some((n) => n.type === "level_up")).toBe(true);
  });

  it("does not notify about home entries", async () => {
    const before = (await db.select().from(notification)).length;
    await giveHomeBehavior(db, fx.users.parentB, fx.students.studentA2.id, { behaviorTypeId: types.read, batchId: newUuid() });
    expect((await db.select().from(notification)).length).toBe(before);
  });
});

describe("notification center", () => {
  it("counts unread, opens only own notifications and marks all read", async () => {
    const [mine] = await listNotifications(db, fx.users.parentA.id, 1);
    const unread = await countUnreadNotifications(db, fx.users.parentA.id);
    expect(unread).toBeGreaterThan(0);

    // Parent B cannot open (or learn about) parent A's notification.
    await expect(openNotification(db, fx.users.parentB.id, mine!.id)).rejects.toMatchObject(FORBIDDEN);
    expect(await openNotification(db, fx.users.parentA.id, mine!.id)).toBe(mine!.url);
    expect(await countUnreadNotifications(db, fx.users.parentA.id)).toBe(unread - (mine!.readAt ? 0 : 1));

    await markAllNotificationsRead(db, fx.users.parentA.id);
    expect(await countUnreadNotifications(db, fx.users.parentA.id)).toBe(0);
    expect(await countUnreadNotifications(db, fx.users.parentB.id)).toBeGreaterThan(0);
  });
});
