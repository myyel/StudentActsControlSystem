import { and, eq, isNull, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { UNDO_WINDOW_MS } from "@/lib/behavior";
import { newUuid } from "@/lib/uuid";
import { db } from "@/server/db";
import { auditLog, behaviorEvent, behaviorType, student } from "@/server/db/schema";
import { listBehaviorTypes, loadDefaultBehaviorTypes, updateBehaviorType } from "@/server/services/behavior-type";
import { deleteEvent, giveBehavior, undoBatch } from "@/server/services/behavior";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

let fx: Awaited<ReturnType<typeof seedAuthFixture>>;
let types: { plus1: string; plus2: string; minus1: string; home: string };

beforeAll(async () => {
  fx = await seedAuthFixture(db);
  await loadDefaultBehaviorTypes(db, fx.classes.classA.id);
  await loadDefaultBehaviorTypes(db, fx.classes.classB.id);
  const list = await listBehaviorTypes(db, fx.classes.classA.id);
  const find = (name: string) => list.find((t) => t.name === name)!.id;
  types = { plus1: find("Yardımlaştı"), plus2: find("Harika iş"), minus1: find("Dersi böldü"), home: find("Kitap okudu") };
});

const A = () => fx.classes.classA.id;

const give = (studentIds: string[], behaviorTypeId: string, extra: { batchId?: string; note?: string | null } = {}) =>
  giveBehavior(db, fx.users.teacherA, A(), {
    studentIds,
    behaviorTypeId,
    note: extra.note ?? null,
    batchId: extra.batchId ?? newUuid(),
  });

async function counters(studentId: string) {
  const [row] = await db.select({ xp: student.xp, balance: student.balance }).from(student).where(eq(student.id, studentId));
  return row!;
}

/** The invariant behind CLAUDE.md rule 4: counters always equal the sum of live events. */
async function expectCountersMatchEvents() {
  const live = (column: typeof behaviorEvent.xpDelta | typeof behaviorEvent.balanceDelta) =>
    sql<number>`coalesce(sum(${column}) filter (where ${behaviorEvent.deletedAt} is null), 0)::int`;
  const rows = await db
    .select({
      xp: student.xp,
      balance: student.balance,
      xpSum: live(behaviorEvent.xpDelta),
      balanceSum: live(behaviorEvent.balanceDelta),
    })
    .from(student)
    .leftJoin(behaviorEvent, eq(behaviorEvent.studentId, student.id))
    .groupBy(student.id);
  for (const r of rows) expect({ xp: r.xp, balance: r.balance }).toEqual({ xp: r.xpSum, balance: r.balanceSum });
}

describe("giveBehavior", () => {
  it("positive points raise both XP and balance", async () => {
    const before = await counters(fx.students.studentA1.id);
    const result = await give([fx.students.studentA1.id], types.plus2, { note: "Resmi çok güzeldi" });
    expect(result).toMatchObject({ count: 1, points: 2, name: "Harika iş", duplicate: false });
    expect(await counters(fx.students.studentA1.id)).toEqual({ xp: before.xp + 2, balance: before.balance + 2 });

    const [event] = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, result.batchId));
    expect(event).toMatchObject({ source: "school", xpDelta: 2, balanceDelta: 2, note: "Resmi çok güzeldi" });
    await expectCountersMatchEvents();
  });

  it("negative points lower the balance but never the XP", async () => {
    const before = await counters(fx.students.studentA1.id);
    await give([fx.students.studentA1.id], types.minus1);
    expect(await counters(fx.students.studentA1.id)).toEqual({ xp: before.xp, balance: before.balance - 1 });
    await expectCountersMatchEvents();
  });

  it("scores several students as one batch", async () => {
    const ids = [fx.students.studentA1.id, fx.students.studentA2.id];
    const result = await give(ids, types.plus1);
    const events = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, result.batchId));
    expect(events.map((e) => e.studentId).sort()).toEqual([...ids].sort());
    const audit = await db.select().from(auditLog).where(eq(auditLog.entityId, result.batchId));
    expect(audit.map((a) => a.action)).toEqual(["behavior.give"]);
  });

  it("writes nothing if any student is outside the class", async () => {
    const batchId = newUuid();
    const before = await counters(fx.students.studentA1.id);
    await expect(give([fx.students.studentA1.id, fx.students.studentB1.id], types.plus1, { batchId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, batchId))).toHaveLength(0);
    expect(await counters(fx.students.studentA1.id)).toEqual(before);
  });

  it("rejects deleted and inactive students", async () => {
    await expect(give([fx.students.deletedStudent.id], types.plus1)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.update(student).set({ active: false }).where(eq(student.id, fx.students.studentA2.id));
    await expect(give([fx.students.studentA2.id], types.plus1)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.update(student).set({ active: true }).where(eq(student.id, fx.students.studentA2.id));
  });

  it("rejects home behaviors, other classes' behaviors and inactive behaviors", async () => {
    await expect(give([fx.students.studentA1.id], types.home)).rejects.toMatchObject({ code: "FORBIDDEN" });

    const [bType] = await listBehaviorTypes(db, fx.classes.classB.id, { scope: "school" });
    await expect(give([fx.students.studentA1.id], bType!.id)).rejects.toMatchObject({ code: "FORBIDDEN" });

    await updateBehaviorType(db, fx.users.teacherA, types.plus1, { active: false });
    await expect(give([fx.students.studentA1.id], types.plus1)).rejects.toThrow(/pasif/);
    await updateBehaviorType(db, fx.users.teacherA, types.plus1, { active: true });
  });

  it("is idempotent for a repeated batch id (double tap or retry)", async () => {
    const batchId = newUuid();
    const before = await counters(fx.students.studentA2.id);
    await give([fx.students.studentA2.id], types.plus1, { batchId });
    const again = await give([fx.students.studentA2.id], types.plus1, { batchId });
    expect(again.duplicate).toBe(true);
    expect(await counters(fx.students.studentA2.id)).toEqual({ xp: before.xp + 1, balance: before.balance + 1 });

    const raced = newUuid();
    const both = await Promise.all([
      give([fx.students.studentA2.id], types.plus1, { batchId: raced }),
      give([fx.students.studentA2.id], types.plus1, { batchId: raced }),
    ]);
    expect(both.filter((r) => !r.duplicate)).toHaveLength(1);
    await expectCountersMatchEvents();
  });

  it("keeps the snapshot when the behavior type changes later", async () => {
    const result = await give([fx.students.studentA2.id], types.plus2);
    await db.update(behaviorType).set({ points: 5, name: "Süper iş" }).where(eq(behaviorType.id, types.plus2));
    const [event] = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, result.batchId));
    expect(event).toMatchObject({ pointsSnapshot: 2, nameSnapshot: "Harika iş", xpDelta: 2 });
    await db.update(behaviorType).set({ points: 2, name: "Harika iş" }).where(eq(behaviorType.id, types.plus2));
  });
});

describe("undoBatch", () => {
  it("restores the counters exactly within the window", async () => {
    const ids = [fx.students.studentA1.id, fx.students.studentA2.id];
    const before = await Promise.all(ids.map(counters));
    const result = await give(ids, types.plus2);
    await expect(undoBatch(db, fx.users.teacherA, result.batchId)).resolves.toEqual({ undone: 2 });
    expect(await Promise.all(ids.map(counters))).toEqual(before);

    const events = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, result.batchId));
    expect(events.every((e) => e.deleteReason === "undo" && e.deletedById === fx.users.teacherA.id)).toBe(true);
    // A second undo changes nothing.
    await expect(undoBatch(db, fx.users.teacherA, result.batchId)).resolves.toEqual({ undone: 0 });
    await expectCountersMatchEvents();
  });

  it("undoes a negative score", async () => {
    const before = await counters(fx.students.studentA1.id);
    const result = await give([fx.students.studentA1.id], types.minus1);
    await undoBatch(db, fx.users.teacherA, result.batchId);
    expect(await counters(fx.students.studentA1.id)).toEqual(before);
  });

  it("refuses after the undo window", async () => {
    const result = await give([fx.students.studentA1.id], types.plus1);
    const later = new Date(Date.now() + UNDO_WINDOW_MS + 1000);
    await expect(undoBatch(db, fx.users.teacherA, result.batchId, null, later)).rejects.toThrow(/süresi doldu/);
    const [event] = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, result.batchId));
    expect(event?.deletedAt).toBeNull();
  });

  it("only the teacher who gave the score can undo it", async () => {
    const result = await give([fx.students.studentA1.id], types.plus1);
    await expect(undoBatch(db, fx.users.teacherB, result.batchId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("deleteEvent", () => {
  it("reverts the counters once, even if deleted twice", async () => {
    const result = await give([fx.students.studentA2.id], types.plus2);
    const [event] = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, result.batchId));
    const before = await counters(fx.students.studentA2.id);

    await deleteEvent(db, fx.users.teacherA, event!.id);
    await deleteEvent(db, fx.users.teacherA, event!.id);
    expect(await counters(fx.students.studentA2.id)).toEqual({ xp: before.xp - 2, balance: before.balance - 2 });

    const audit = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "behavior.delete"), eq(auditLog.entityId, event!.id)));
    expect(audit).toHaveLength(1);
    await expectCountersMatchEvents();
  });

  it("deletes a single student's event out of a bulk batch", async () => {
    const ids = [fx.students.studentA1.id, fx.students.studentA2.id];
    const result = await give(ids, types.plus1);
    const [first] = await db
      .select()
      .from(behaviorEvent)
      .where(and(eq(behaviorEvent.batchId, result.batchId), eq(behaviorEvent.studentId, ids[0]!)));
    await deleteEvent(db, fx.users.teacherA, first!.id);
    const live = await db
      .select()
      .from(behaviorEvent)
      .where(and(eq(behaviorEvent.batchId, result.batchId), isNull(behaviorEvent.deletedAt)));
    expect(live.map((e) => e.studentId)).toEqual([ids[1]]);
    await expectCountersMatchEvents();
  });
});
