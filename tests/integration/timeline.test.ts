import { beforeAll, describe, expect, it, vi } from "vitest";
import { newUuid } from "@/lib/uuid";
import { db } from "@/server/db";
import { behaviorEvent } from "@/server/db/schema";
import { assertTeacherOfStudent } from "@/server/auth/guards";
import { getLast7Days, getStudentTimeline, localDay } from "@/server/services/timeline";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

const TZ = "Europe/Istanbul";
let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
});

/** Timeline tests only need events; counters are covered in behavior.test.ts. */
async function addEvent(studentId: string, points: number, createdAt: Date, deleted = false) {
  const [row] = await db
    .insert(behaviorEvent)
    .values({
      studentId,
      classId: fx.classes.classA.id,
      nameSnapshot: points > 0 ? "Yardımlaştı" : "Dersi böldü",
      iconSnapshot: points > 0 ? "🤝" : "🔇",
      pointsSnapshot: points,
      xpDelta: Math.max(points, 0),
      balanceDelta: points,
      source: "school",
      givenById: fx.users.teacherA.id,
      batchId: newUuid(),
      createdAt,
      deletedAt: deleted ? new Date() : null,
      deleteReason: deleted ? "delete" : null,
    })
    .returning();
  return row!;
}

describe("getStudentTimeline", () => {
  it("returns newest first, hides deleted events and pages with hasMore", async () => {
    const id = fx.students.studentA1.id;
    const base = Date.UTC(2026, 8, 1, 9);
    for (let i = 0; i < 5; i++) await addEvent(id, 1, new Date(base + i * 60_000));
    const deleted = await addEvent(id, 2, new Date(base + 10 * 60_000), true);

    const page = await getStudentTimeline(db, id, 3);
    expect(page.items).toHaveLength(3);
    expect(page.hasMore).toBe(true);
    expect(page.items.map((e) => e.createdAt.getTime())).toEqual([
      base + 4 * 60_000,
      base + 3 * 60_000,
      base + 2 * 60_000,
    ]);

    const all = await getStudentTimeline(db, id, 50);
    expect(all.hasMore).toBe(false);
    expect(all.items.map((e) => e.id)).not.toContain(deleted.id);
    expect(all.items[0]?.givenByName).toBe("teacherA@test");
  });

  it("only returns the requested student's events", async () => {
    await addEvent(fx.students.studentA2.id, 1, new Date());
    const items = (await getStudentTimeline(db, fx.students.studentA1.id, 100)).items;
    const ids = new Set(
      (await db.select({ id: behaviorEvent.id, studentId: behaviorEvent.studentId }).from(behaviorEvent))
        .filter((e) => e.studentId !== fx.students.studentA1.id)
        .map((e) => e.id),
    );
    expect(items.some((e) => ids.has(e.id))).toBe(false);
  });
});

describe("getLast7Days", () => {
  it("buckets by the school's time zone and fills empty days with 0", async () => {
    const id = fx.students.studentB1.id;
    // 2026-09-20 21:30 UTC is 2026-09-21 00:30 in Istanbul.
    const lateEvening = new Date(Date.UTC(2026, 8, 20, 21, 30));
    await addEvent(id, 2, lateEvening);
    await addEvent(id, -1, new Date(Date.UTC(2026, 8, 21, 10)));
    await addEvent(id, 1, new Date(Date.UTC(2026, 8, 23, 10)));
    await addEvent(id, 3, new Date(Date.UTC(2026, 8, 23, 11)), true); // deleted: ignored
    await addEvent(id, 5, new Date(Date.UTC(2026, 8, 10, 10))); // older than 7 days: ignored

    const now = new Date(Date.UTC(2026, 8, 26, 12));
    const days = await getLast7Days(db, id, TZ, now);
    expect(days.map((d) => d.day)).toEqual([
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ]);
    expect(days.find((d) => d.day === "2026-09-20")).toEqual({ day: "2026-09-20", positive: 0, negative: 0 });
    expect(days.find((d) => d.day === "2026-09-21")).toEqual({ day: "2026-09-21", positive: 2, negative: 1 });
    expect(days.find((d) => d.day === "2026-09-23")).toEqual({ day: "2026-09-23", positive: 1, negative: 0 });
    expect(days.reduce((s, d) => s + d.positive + d.negative, 0)).toBe(4);
  });

  it("localDay uses the given time zone", () => {
    expect(localDay(new Date(Date.UTC(2026, 8, 20, 21, 30)), TZ)).toBe("2026-09-21");
    expect(localDay(new Date(Date.UTC(2026, 8, 20, 21, 30)), "UTC")).toBe("2026-09-20");
  });
});

describe("authorization", () => {
  // The student page runs assertTeacherOfStudent before loading the timeline.
  it("veli A, öğrenci B'nin zaman çizelgesine erişemez; öğretmen B de erişemez", async () => {
    await expect(assertTeacherOfStudent(fx.users.parentA, fx.students.studentA2.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(assertTeacherOfStudent(fx.users.teacherB, fx.students.studentA1.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
