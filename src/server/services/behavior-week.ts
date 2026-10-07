import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { behaviorEvent, school, schoolClass, student } from "@/server/db/schema";
import { forbidden } from "@/server/auth/errors";
import { localDay, type DaySummary } from "./timeline";

/** How far back the week pages go (about a school year). */
export const MAX_WEEK_OFFSET = 52;

const DAY_MS = 86_400_000;

export type BehaviorSource = "school" | "home";

export type BehaviorWeekRow = {
  /** Where it was given; the same name at school and at home is two rows. */
  source: BehaviorSource;
  name: string;
  icon: string;
  /** Teacher-given negatives are kept apart from positives, even with the same name. */
  positive: boolean;
  /** Times per day, aligned with `days`. */
  perDay: number[];
  count: number;
  /** Sum of the balance change, e.g. +5 or −2. */
  points: number;
};

/** One source's week: points per day and its behaviors, most frequent first. */
export type BehaviorSourceWeek = {
  summary: DaySummary[];
  positives: BehaviorWeekRow[];
  negatives: BehaviorWeekRow[];
};

/**
 * Per-behavior counts for one 7-day window: `weekOffset` 0 is the last 7 days (today included),
 * 1 the 7 days before that, and so on; days are in the school's time zone. School and home
 * behaviors are returned apart, each with its own daily summary. Teacher notes and who gave a
 * score are not returned. No ownership check: callers look the student up first
 * (getBehaviorWeekForParent, getBehaviorWeekForTeacher).
 */
export async function getBehaviorWeek(
  db: Db,
  child: { id: string; timeZone: string },
  weekOffset = 0,
  now = new Date(),
) {
  const offset = Math.min(Math.max(Math.trunc(weekOffset), 0), MAX_WEEK_OFFSET);
  const end = new Date(now.getTime() - offset * 7 * DAY_MS);
  const days = Array.from({ length: 7 }, (_, i) => localDay(new Date(end.getTime() - (6 - i) * DAY_MS), child.timeZone));
  const first = days[0]!;
  const last = days[6]!;
  const localDate = sql<string>`to_char(${behaviorEvent.createdAt} at time zone ${child.timeZone}, 'YYYY-MM-DD')`;
  const live = and(eq(behaviorEvent.studentId, child.id), isNull(behaviorEvent.deletedAt));

  const [rows, [older]] = await Promise.all([
    db
      .select({
        day: localDate,
        source: behaviorEvent.source,
        name: behaviorEvent.nameSnapshot,
        icon: behaviorEvent.iconSnapshot,
        positive: sql<boolean>`${behaviorEvent.pointsSnapshot} > 0`,
        count: sql<number>`count(*)::int`,
        points: sql<number>`coalesce(sum(${behaviorEvent.balanceDelta}), 0)::int`,
      })
      .from(behaviorEvent)
      // Generous bounds; exact day bucketing happens in the time zone below.
      .where(
        and(
          live,
          gte(behaviorEvent.createdAt, new Date(end.getTime() - 8 * DAY_MS)),
          lt(behaviorEvent.createdAt, new Date(end.getTime() + 2 * DAY_MS)),
        ),
      )
      // By position, as in getLast7Days: the time zone is a separate parameter in each clause.
      .groupBy(sql`1`, sql`2`, sql`3`, sql`4`, sql`5`),
    // Enables "Önceki hafta" only when there is something to see there.
    db
      .select({ id: behaviorEvent.id })
      .from(behaviorEvent)
      .where(and(live, sql`${localDate} < ${first}`))
      .limit(1),
  ]);

  const dayIndex = new Map(days.map((d, i) => [d, i]));
  const byBehavior = new Map<string, BehaviorWeekRow>();
  const emptySummary = (): DaySummary[] => days.map((day) => ({ day, positive: 0, negative: 0 }));
  const summaries: Record<BehaviorSource, DaySummary[]> = { school: emptySummary(), home: emptySummary() };
  for (const r of rows) {
    const i = dayIndex.get(r.day);
    if (i === undefined) continue;
    const key = `${r.source}${r.positive ? "+" : "-"}${r.icon}\u0000${r.name}`;
    let row = byBehavior.get(key);
    if (!row) {
      row = {
        source: r.source,
        name: r.name,
        icon: r.icon,
        positive: r.positive,
        perDay: Array(7).fill(0),
        count: 0,
        points: 0,
      };
      byBehavior.set(key, row);
    }
    row.perDay[i]! += r.count;
    row.count += r.count;
    row.points += r.points;
    const summary = summaries[r.source];
    if (r.points > 0) summary[i]!.positive += r.points;
    else summary[i]!.negative -= r.points;
  }

  const byCount = (a: BehaviorWeekRow, b: BehaviorWeekRow) => b.count - a.count || a.name.localeCompare(b.name, "tr");
  const behaviors = [...byBehavior.values()];
  const bySource = (source: BehaviorSource): BehaviorSourceWeek => ({
    summary: summaries[source],
    positives: behaviors.filter((b) => b.source === source && b.positive).sort(byCount),
    negatives: behaviors.filter((b) => b.source === source && !b.positive).sort(byCount),
  });
  return {
    weekOffset: offset,
    days,
    from: first,
    to: last,
    hasOlder: offset < MAX_WEEK_OFFSET && older !== undefined,
    school: bySource("school"),
    home: bySource("home"),
  };
}

export type BehaviorWeek = Awaited<ReturnType<typeof getBehaviorWeek>>;

/**
 * The teacher's view of a student's week. The caller runs assertTeacherOfStudent first; a deleted
 * or unknown student is FORBIDDEN. `classId` lets the page check the class in its URL.
 */
export async function getBehaviorWeekForTeacher(db: Db, studentId: string, weekOffset = 0, now = new Date()) {
  const [child] = await db
    .select({
      id: student.id,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
      classId: student.classId,
      timeZone: school.timezone,
    })
    .from(student)
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .innerJoin(school, eq(school.id, schoolClass.schoolId))
    .where(and(eq(student.id, studentId), isNull(student.deletedAt)));
  if (!child) throw forbidden();

  const week = await getBehaviorWeek(db, child, weekOffset, now);
  return {
    child: { id: child.id, firstName: child.firstName, lastInitial: child.lastInitial, classId: child.classId },
    ...week,
  };
}
