import { beforeAll, describe, expect, it, vi } from "vitest";
import { newUuid } from "@/lib/uuid";
import { db } from "@/server/db";
import { behaviorEvent } from "@/server/db/schema";
import { assertTeacherOfStudent } from "@/server/auth/guards";
import { getBehaviorWeekForTeacher } from "@/server/services/behavior-week";
import { getBehaviorWeekForParent, MAX_WEEK_OFFSET } from "@/server/services/parent-behaviors";
import { behaviorWeekQuerySchema } from "@/server/validation/parent";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const FORBIDDEN = { code: "FORBIDDEN" };
// 13:00 in Istanbul on Monday 28 September; the last 7 days are 22–28 September.
const NOW = new Date("2026-09-28T10:00:00Z");

// Fixture: parent A → studentA1 (class A) and studentB1; parent B → studentA2 (class A).
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

async function event(
  studentId: string,
  createdAt: string,
  { name = "Yardımlaştı", icon = "🤝", points = 1, deleted = false, home = false } = {},
) {
  await db.insert(behaviorEvent).values({
    studentId,
    classId: fx.classes.classA.id,
    nameSnapshot: name,
    iconSnapshot: icon,
    pointsSnapshot: points,
    xpDelta: Math.max(points, 0),
    balanceDelta: points,
    source: home ? "home" : "school",
    givenById: home ? fx.users.parentA.id : fx.users.teacherA.id,
    batchId: newUuid(),
    createdAt: new Date(createdAt),
    deletedAt: deleted ? new Date() : null,
    deleteReason: deleted ? "delete" : null,
  });
}

beforeAll(async () => {
  fx = await seedAuthFixture(db);
  const a1 = fx.students.studentA1.id;
  // This week.
  await event(a1, "2026-09-28T08:00:00Z");
  await event(a1, "2026-09-28T09:00:00Z");
  // 23:30 on the 22nd in Istanbul (UTC+3) is still the 22nd, the first day of the window.
  await event(a1, "2026-09-22T20:30:00Z");
  // 23:30 on the 21st in Istanbul is the day before the window: last week.
  await event(a1, "2026-09-21T20:30:00Z", { name: "Kitap okudu", icon: "📖", points: 2 });
  // 00:30 on the 22nd in Istanbul is still the 21st in UTC: this week.
  await event(a1, "2026-09-21T21:30:00Z", { name: "Sırasını bekledi", icon: "⏳" });
  await event(a1, "2026-09-25T10:00:00Z", { name: "Dersi böldü", icon: "🔇", points: -1 });
  await event(a1, "2026-09-26T10:00:00Z", { name: "Kitap okudu", icon: "📖", points: 2 });
  await event(a1, "2026-09-27T10:00:00Z", { deleted: true });
  // At home: the same name as a school behavior stays a separate row.
  await event(a1, "2026-09-24T16:00:00Z", { name: "Kitap okudu", icon: "📖", home: true });
  await event(a1, "2026-09-28T07:00:00Z", { name: "Kitap okudu", icon: "📖", home: true });
  await event(a1, "2026-09-28T07:30:00Z", { name: "Odasını topladı", icon: "🧹", points: 2, home: true });
  // Another parent's child.
  await event(fx.students.studentA2.id, "2026-09-28T08:00:00Z", { name: "Gizli", icon: "🙈" });
});

describe("getBehaviorWeekForParent", () => {
  it("counts each behavior per day in the school's time zone", async () => {
    const week = await getBehaviorWeekForParent(db, fx.users.parentA.id, fx.students.studentA1.id, 0, NOW);
    expect(week.days).toEqual([
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
    ]);
    const school = { source: "school", positive: true };
    expect(week.school.positives).toEqual([
      { ...school, name: "Yardımlaştı", icon: "🤝", perDay: [1, 0, 0, 0, 0, 0, 2], count: 3, points: 3 },
      { ...school, name: "Kitap okudu", icon: "📖", perDay: [0, 0, 0, 0, 1, 0, 0], count: 1, points: 2 },
      { ...school, name: "Sırasını bekledi", icon: "⏳", perDay: [1, 0, 0, 0, 0, 0, 0], count: 1, points: 1 },
    ]);
    expect(week.school.negatives).toEqual([
      { ...school, name: "Dersi böldü", icon: "🔇", positive: false, perDay: [0, 0, 0, 1, 0, 0, 0], count: 1, points: -1 },
    ]);
    expect(week.school.summary.map((d) => [d.positive, d.negative])).toEqual([
      [2, 0], [0, 0], [0, 0], [0, 1], [2, 0], [0, 0], [2, 0],
    ]);
    expect(week.hasOlder).toBe(true);
  });

  it("keeps home behaviors apart from school ones", async () => {
    const week = await getBehaviorWeekForParent(db, fx.users.parentA.id, fx.students.studentA1.id, 0, NOW);
    const home = { source: "home", positive: true };
    expect(week.home.positives).toEqual([
      { ...home, name: "Kitap okudu", icon: "📖", perDay: [0, 0, 1, 0, 0, 0, 1], count: 2, points: 2 },
      { ...home, name: "Odasını topladı", icon: "🧹", perDay: [0, 0, 0, 0, 0, 0, 1], count: 1, points: 2 },
    ]);
    expect(week.home.negatives).toEqual([]);
    expect(week.home.summary.map((d) => [d.positive, d.negative])).toEqual([
      [0, 0], [0, 0], [1, 0], [0, 0], [0, 0], [0, 0], [3, 0],
    ]);
    // Never another child's behavior, not even its name.
    expect(JSON.stringify(week)).not.toContain("Gizli");
  });

  it("pages back a week at a time", async () => {
    const week = await getBehaviorWeekForParent(db, fx.users.parentA.id, fx.students.studentA1.id, 1, NOW);
    expect(week.from).toBe("2026-09-15");
    expect(week.to).toBe("2026-09-21");
    expect(week.school.positives).toEqual([
      { source: "school", name: "Kitap okudu", icon: "📖", positive: true, perDay: [0, 0, 0, 0, 0, 0, 1], count: 1, points: 2 },
    ]);
    expect(week.home.positives).toEqual([]);
    expect(week.hasOlder).toBe(false);

    const far = await getBehaviorWeekForParent(db, fx.users.parentA.id, fx.students.studentA1.id, 999, NOW);
    expect(far.weekOffset).toBe(MAX_WEEK_OFFSET);
    expect(far.school.positives).toEqual([]);
    expect(far.home.positives).toEqual([]);
  });

  it("refuses a child the parent is not linked to, and a deleted child", async () => {
    await expect(
      getBehaviorWeekForParent(db, fx.users.parentA.id, fx.students.studentA2.id, 0, NOW),
    ).rejects.toMatchObject(FORBIDDEN);
    await expect(
      getBehaviorWeekForParent(db, fx.users.parentB.id, fx.students.studentA1.id, 0, NOW),
    ).rejects.toMatchObject(FORBIDDEN);
    await expect(
      getBehaviorWeekForParent(db, fx.users.parentA.id, fx.students.deletedStudent.id, 0, NOW),
    ).rejects.toMatchObject(FORBIDDEN);
  });
});

describe("getBehaviorWeekForTeacher", () => {
  it("returns the same week the parent sees, with the student's class", async () => {
    const a1 = fx.students.studentA1.id;
    const teacher = await getBehaviorWeekForTeacher(db, a1, 0, NOW);
    const { child, ...parentWeek } = await getBehaviorWeekForParent(db, fx.users.parentA.id, a1, 0, NOW);
    expect(teacher).toEqual({ ...parentWeek, child: { ...child, classId: fx.classes.classA.id } });
    expect(JSON.stringify(teacher)).not.toContain("Gizli");
  });

  it("is reached only by the teacher of the student's class", async () => {
    // The page runs this guard before the service.
    await expect(assertTeacherOfStudent(fx.users.teacherA, fx.students.studentA1.id)).resolves.toBeUndefined();
    await expect(assertTeacherOfStudent(fx.users.teacherB, fx.students.studentA1.id)).rejects.toMatchObject(FORBIDDEN);
    await expect(assertTeacherOfStudent(fx.users.parentA, fx.students.studentA1.id)).rejects.toMatchObject(FORBIDDEN);
  });

  it("refuses a deleted or unknown student", async () => {
    await expect(getBehaviorWeekForTeacher(db, fx.students.deletedStudent.id, 0, NOW)).rejects.toMatchObject(FORBIDDEN);
    await expect(getBehaviorWeekForTeacher(db, newUuid(), 0, NOW)).rejects.toMatchObject(FORBIDDEN);
  });
});

describe("behaviorWeekQuerySchema", () => {
  it("falls back to this week on bad input", () => {
    expect(behaviorWeekQuerySchema.parse({ hafta: "2" })).toEqual({ hafta: 2 });
    expect(behaviorWeekQuerySchema.parse({ hafta: "-1" })).toEqual({ hafta: undefined });
    expect(behaviorWeekQuerySchema.parse({ hafta: "abc" })).toEqual({ hafta: undefined });
    expect(behaviorWeekQuerySchema.parse({ hafta: "99" })).toEqual({ hafta: undefined });
  });
});
