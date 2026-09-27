import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { newUuid } from "@/lib/uuid";
import { db } from "@/server/db";
import { auditLog, behaviorEvent, behaviorType, parentStudent, schoolClass, student } from "@/server/db/schema";
import { UserError } from "@/server/action-result";
import { assertParentOfStudent, assertTeacherOfClass } from "@/server/auth/guards";
import { deleteEvent, giveBehavior, undoBatch } from "@/server/services/behavior";
import { listBehaviorTypes, loadDefaultBehaviorTypes } from "@/server/services/behavior-type";
import { updateHomeDailyXpCap } from "@/server/services/class";
import { getHomeBatchStudentId, giveHomeBehavior, homeXpToday } from "@/server/services/home-behavior";
import { getParentDashboard } from "@/server/services/parent-dashboard";
import { getStudentTimeline } from "@/server/services/timeline";
import { homeDailyXpCapSchema } from "@/server/validation/class";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { code: "FORBIDDEN" };
const TZ = "Europe/Istanbul";
// 13:00 in Istanbul on 28 September.
const NOW = new Date("2026-09-28T10:00:00Z");
const at = (iso: string) => new Date(iso);

// Fixture: parent A → studentA1 (Ada, class A) and studentB1 (Can, class B); parent B → studentA2 (Ali, class A).
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;
let types: { read: string; big: string; school: string; homeB: string };

beforeAll(async () => {
  fx = await seedAuthFixture(db);
  await loadDefaultBehaviorTypes(db, fx.classes.classA.id);
  await loadDefaultBehaviorTypes(db, fx.classes.classB.id);
  const listA = await listBehaviorTypes(db, fx.classes.classA.id);
  const listB = await listBehaviorTypes(db, fx.classes.classB.id);
  const [big] = await db
    .insert(behaviorType)
    .values({ classId: fx.classes.classA.id, name: "Kardeşine yardım etti", icon: "🧸", points: 4, scope: "home" })
    .returning();
  types = {
    read: listA.find((t) => t.name === "Kitap okudu")!.id,
    big: big!.id,
    school: listA.find((t) => t.name === "Yardımlaştı")!.id,
    homeB: listB.find((t) => t.name === "Kitap okudu")!.id,
  };
});

const A1 = () => fx.students.studentA1.id;

const home = (behaviorTypeId: string, opts: { now?: Date; studentId?: string; parent?: "parentA" | "parentB"; batchId?: string } = {}) =>
  giveHomeBehavior(
    db,
    fx.users[opts.parent ?? "parentA"],
    opts.studentId ?? A1(),
    { behaviorTypeId, batchId: opts.batchId ?? newUuid() },
    null,
    opts.now ?? NOW,
  );

async function counters(studentId: string) {
  const [row] = await db
    .select({ xp: student.xp, balance: student.balance, level: student.characterLevel })
    .from(student)
    .where(eq(student.id, studentId));
  return row!;
}

/** CLAUDE.md rule 4 for the child under test (another test sets a classmate's XP directly). */
async function expectCountersMatchEvents() {
  const rows = await db
    .select({
      xp: student.xp,
      balance: student.balance,
      xpSum: sql<number>`coalesce(sum(${behaviorEvent.xpDelta}) filter (where ${behaviorEvent.deletedAt} is null), 0)::int`,
      balanceSum: sql<number>`coalesce(sum(${behaviorEvent.balanceDelta}) filter (where ${behaviorEvent.deletedAt} is null), 0)::int`,
    })
    .from(student)
    .leftJoin(behaviorEvent, eq(behaviorEvent.studentId, student.id))
    .where(eq(student.id, A1()))
    .groupBy(student.id);
  for (const r of rows) expect({ xp: r.xp, balance: r.balance }).toEqual({ xp: r.xpSum, balance: r.balanceSum });
}

const setCap = (cap: number) =>
  db.update(schoolClass).set({ homeDailyXpCap: cap }).where(eq(schoolClass.id, fx.classes.classA.id));

describe("giveHomeBehavior", () => {
  it("adds XP and balance as a home event given by the parent", async () => {
    const before = await counters(A1());
    const result = await home(types.read);

    expect(result).toMatchObject({ points: 1, xpAdded: 1, todayXp: 1, cap: 10, duplicate: false, levelUps: [] });
    expect(await counters(A1())).toMatchObject({ xp: before.xp + 1, balance: before.balance + 1 });

    const [event] = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, result.batchId));
    expect(event).toMatchObject({ source: "home", givenById: fx.users.parentA.id, xpDelta: 1, balanceDelta: 1, note: null });
    const [audit] = await db.select().from(auditLog).where(eq(auditLog.entityId, result.batchId));
    expect(audit).toMatchObject({ action: "behavior.give_home", actorId: fx.users.parentA.id });
    await expectCountersMatchEvents();
  });

  it("caps the XP per day but still counts the full points in the balance", async () => {
    await setCap(5);
    const first = await home(types.big); // 1 + 4 = 5
    expect(first).toMatchObject({ xpAdded: 4, todayXp: 5, cap: 5 });

    const before = await counters(A1());
    const capped = await home(types.read);
    expect(capped).toMatchObject({ xpAdded: 0, todayXp: 5 });
    expect(await counters(A1())).toEqual({ ...before, balance: before.balance + 1 });

    const partial = await home(types.big, { batchId: newUuid() });
    expect(partial.xpAdded).toBe(0);
    await expectCountersMatchEvents();
  });

  it("gives only the part that still fits under the cap", async () => {
    await setCap(7); // used 5 → room for 2
    expect((await home(types.big)).xpAdded).toBe(2);
    expect(await homeXpToday(db, A1(), TZ, NOW)).toBe(7);
    await setCap(5);
  });

  it("frees the cap again when an entry is undone", async () => {
    const used = await homeXpToday(db, A1(), TZ, NOW);
    const entry = await home(types.read, { now: new Date(NOW.getTime() + 1000) });
    expect(entry.xpAdded).toBe(0);

    // Undo the 4-XP entry from the cap test: it was given at NOW, undone 5 s later.
    const [bigEvent] = await db
      .select()
      .from(behaviorEvent)
      .where(and(eq(behaviorEvent.studentId, A1()), eq(behaviorEvent.behaviorTypeId, types.big), eq(behaviorEvent.xpDelta, 4)));
    await undoBatch(db, fx.users.parentA, bigEvent!.batchId, null, new Date(NOW.getTime() + 5000));
    expect(await homeXpToday(db, A1(), TZ, NOW)).toBe(used - 4);
    await expectCountersMatchEvents();
  });

  it("starts a new day at midnight in the school's time zone", async () => {
    await setCap(3);
    const lateEvening = at("2026-09-28T20:59:00Z"); // 23:59 in Istanbul, same day as NOW
    expect((await home(types.read, { now: lateEvening })).todayXp).toBeGreaterThanOrEqual(3);

    const afterMidnight = at("2026-09-28T21:01:00Z"); // 00:01 on 29 September in Istanbul
    const next = await home(types.big, { now: afterMidnight });
    expect(next).toMatchObject({ xpAdded: 3, todayXp: 3 });
    await setCap(10);
  });

  it("gives no XP at all when the cap is 0", async () => {
    await setCap(0);
    const before = await counters(A1());
    const result = await home(types.read, { now: at("2026-09-30T10:00:00Z") });
    expect(result).toMatchObject({ xpAdded: 0, todayXp: 0, cap: 0 });
    expect(await counters(A1())).toEqual({ ...before, balance: before.balance + 1 });
    await setCap(10);
  });

  it("shares one cap between the child's parents", async () => {
    await db.insert(parentStudent).values({ parentId: fx.users.parentB.id, studentId: A1() });
    await setCap(5);
    const day = at("2026-10-01T09:00:00Z");
    await home(types.big, { now: day });
    const other = await home(types.big, { now: day, parent: "parentB" });
    expect(other).toMatchObject({ xpAdded: 1, todayXp: 5 });
    await db.delete(parentStudent).where(and(eq(parentStudent.parentId, fx.users.parentB.id), eq(parentStudent.studentId, A1())));
    await setCap(10);
  });

  it("raises the character level in the same transaction", async () => {
    await db.update(student).set({ xp: 19, characterLevel: 1 }).where(eq(student.id, fx.students.studentA2.id));
    const result = await home(types.read, { studentId: fx.students.studentA2.id, parent: "parentB" });
    expect(result.levelUps.map((u) => [u.fromLevel, u.toLevel])).toEqual([[1, 2]]);
    expect(await counters(fx.students.studentA2.id)).toMatchObject({ xp: 20, level: 2 });
  });

  it("returns a retried entry instead of writing it twice", async () => {
    const batchId = newUuid();
    const before = await counters(A1());
    await home(types.read, { batchId, now: at("2026-10-02T09:00:00Z") });
    const retry = await home(types.read, { batchId, now: at("2026-10-02T09:00:00Z") });
    expect(retry).toMatchObject({ duplicate: true, xpAdded: 1, todayXp: 1 });
    expect(await counters(A1())).toMatchObject({ xp: before.xp + 1, balance: before.balance + 1 });

    // The same batch id cannot be replayed against another child.
    await expect(home(types.read, { batchId, studentId: fx.students.studentB1.id })).rejects.toMatchObject(FORBIDDEN);
  });

  it("accepts only active home behaviors of the child's own class", async () => {
    await expect(home(types.school)).rejects.toMatchObject(FORBIDDEN);
    await expect(home(types.homeB)).rejects.toMatchObject(FORBIDDEN);
    await expect(home("00000000-0000-4000-8000-000000000000")).rejects.toMatchObject(FORBIDDEN);

    await db.update(behaviorType).set({ active: false }).where(eq(behaviorType.id, types.read));
    await expect(home(types.read)).rejects.toBeInstanceOf(UserError);
    await db.update(behaviorType).set({ active: true }).where(eq(behaviorType.id, types.read));
  });

  it("rejects entries for an inactive child", async () => {
    await db.update(student).set({ active: false }).where(eq(student.id, A1()));
    await expect(home(types.read)).rejects.toBeInstanceOf(UserError);
    await db.update(student).set({ active: true }).where(eq(student.id, A1()));
  });

  it("keeps teachers on school behaviors", async () => {
    await expect(
      giveBehavior(db, fx.users.teacherA, fx.classes.classA.id, {
        studentIds: [A1()],
        behaviorTypeId: types.read,
        note: null,
        batchId: newUuid(),
      }),
    ).rejects.toMatchObject(FORBIDDEN);
  });
});

describe("Veli A, öğrenci B'nin verisine erişemez", () => {
  it("parent A cannot enter or undo home behaviors for another child", async () => {
    await expect(assertParentOfStudent(fx.users.parentA, fx.students.studentA2.id)).rejects.toMatchObject(FORBIDDEN);

    const entry = await home(types.read, { studentId: fx.students.studentA2.id, parent: "parentB", now: new Date() });
    // The action resolves the entry's child and checks the link before undoing.
    const childOfEntry = await getHomeBatchStudentId(db, entry.batchId);
    await expect(assertParentOfStudent(fx.users.parentA, childOfEntry)).rejects.toMatchObject(FORBIDDEN);
    // Even past the guard, only the parent who gave it can undo it.
    await expect(undoBatch(db, fx.users.parentA, entry.batchId)).rejects.toMatchObject(FORBIDDEN);
    await expect(undoBatch(db, fx.users.teacherA, entry.batchId)).rejects.toMatchObject(FORBIDDEN);
    expect(await undoBatch(db, fx.users.parentB, entry.batchId)).toEqual({ undone: 1 });
  });

  it("does not resolve school batches as home entries", async () => {
    const school = await giveBehavior(db, fx.users.teacherA, fx.classes.classA.id, {
      studentIds: [A1()],
      behaviorTypeId: types.school,
      note: null,
      batchId: newUuid(),
    });
    await expect(getHomeBatchStudentId(db, school.batchId)).rejects.toMatchObject(FORBIDDEN);
  });

  it("parent A cannot open another child's dashboard", async () => {
    await expect(getParentDashboard(db, fx.users.parentA.id, fx.students.studentA2.id)).rejects.toMatchObject(FORBIDDEN);
    await expect(getParentDashboard(db, fx.users.parentA.id, fx.students.deletedStudent.id)).rejects.toMatchObject(
      FORBIDDEN,
    );
  });

  it("the dashboard holds only the child's own data and no teacher notes", async () => {
    const noted = await giveBehavior(db, fx.users.teacherA, fx.classes.classA.id, {
      studentIds: [A1(), fx.students.studentA2.id],
      behaviorTypeId: types.school,
      note: "Öğretmene özel not",
      batchId: newUuid(),
    });
    // Newer than the home entries above, so it is among the recent events.
    await db.update(behaviorEvent).set({ createdAt: at("2026-10-03T09:00:00Z") }).where(eq(behaviorEvent.batchId, noted.batchId));
    const dashboard = await getParentDashboard(db, fx.users.parentA.id, A1());
    const serialized = JSON.stringify(dashboard);

    expect(dashboard.child).toMatchObject({ id: A1(), firstName: "Ada", className: "2-A" });
    expect(serialized).not.toContain(fx.students.studentA2.id);
    expect(serialized).not.toContain("Ali");
    expect(serialized).not.toContain("Öğretmene özel not");
    expect(serialized).not.toContain(fx.users.teacherA.id);

    expect(dashboard.recent.length).toBeGreaterThan(0);
    expect(new Set(dashboard.recent.map((e) => e.source))).toEqual(new Set(["school", "home"]));
    expect(dashboard.home.types.map((t) => t.name).sort()).toEqual(
      ["Dişlerini fırçaladı", "Ev işine yardım etti", "Kardeşine yardım etti", "Kitap okudu", "Odasını topladı"].sort(),
    );
    expect(dashboard.weekBalance).toBe(dashboard.week.reduce((s, d) => s + d.positive - d.negative, 0));
  });
});

describe("home daily XP cap setting", () => {
  it("is changed by the class's teacher and audited", async () => {
    await expect(assertTeacherOfClass(fx.users.teacherB, fx.classes.classA.id)).rejects.toMatchObject(FORBIDDEN);

    await updateHomeDailyXpCap(db, fx.users.teacherA, fx.classes.classA.id, 6);
    const [cls] = await db.select().from(schoolClass).where(eq(schoolClass.id, fx.classes.classA.id));
    expect(cls!.homeDailyXpCap).toBe(6);
    const audits = await db.select().from(auditLog).where(eq(auditLog.action, "class.update"));
    expect(audits.at(-1)!.data).toEqual({ homeDailyXpCap: { from: 10, to: 6 } });
  });

  it("accepts 0–50 only", () => {
    expect(homeDailyXpCapSchema.safeParse({ homeDailyXpCap: "0" }).success).toBe(true);
    expect(homeDailyXpCapSchema.safeParse({ homeDailyXpCap: "50" }).success).toBe(true);
    expect(homeDailyXpCapSchema.safeParse({ homeDailyXpCap: "51" }).success).toBe(false);
    expect(homeDailyXpCapSchema.safeParse({ homeDailyXpCap: "-1" }).success).toBe(false);
    expect(homeDailyXpCapSchema.safeParse({ homeDailyXpCap: "2.5" }).success).toBe(false);
  });
});

describe("teacher timeline", () => {
  it("filters by source and shows capped XP", async () => {
    const homeOnly = await getStudentTimeline(db, A1(), 100, "home");
    expect(homeOnly.items.length).toBeGreaterThan(0);
    expect(homeOnly.items.every((e) => e.source === "home")).toBe(true);
    expect(homeOnly.items.some((e) => e.xpDelta < e.points)).toBe(true);
    expect((await getStudentTimeline(db, A1(), 100, "school")).items.every((e) => e.source === "school")).toBe(true);
  });

  it("a teacher can delete a parent's home entry; exactly its capped XP is taken back", async () => {
    const [capped] = await db
      .select()
      .from(behaviorEvent)
      .where(and(eq(behaviorEvent.studentId, A1()), eq(behaviorEvent.source, "home"), eq(behaviorEvent.xpDelta, 0), sql`${behaviorEvent.deletedAt} is null`))
      .limit(1);
    const before = await counters(A1());
    await deleteEvent(db, fx.users.teacherA, capped!.id);
    expect(await counters(A1())).toMatchObject({ xp: before.xp, balance: before.balance - capped!.balanceDelta });
    await expectCountersMatchEvents();
  });
});
