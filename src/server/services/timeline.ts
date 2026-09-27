import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { behaviorEvent, user, type BehaviorScope } from "@/server/db/schema";

export const TIMELINE_PAGE = 30;
export const TIMELINE_MAX = 500;

/** Call only after assertTeacherOfStudent. Newest first, deleted events hidden; optionally one source only. */
export async function getStudentTimeline(db: Db, studentId: string, limit = TIMELINE_PAGE, source?: BehaviorScope) {
  const rows = await db
    .select({
      id: behaviorEvent.id,
      name: behaviorEvent.nameSnapshot,
      icon: behaviorEvent.iconSnapshot,
      points: behaviorEvent.pointsSnapshot,
      xpDelta: behaviorEvent.xpDelta,
      source: behaviorEvent.source,
      note: behaviorEvent.note,
      createdAt: behaviorEvent.createdAt,
      givenByName: user.name,
    })
    .from(behaviorEvent)
    .leftJoin(user, eq(user.id, behaviorEvent.givenById))
    .where(
      and(
        eq(behaviorEvent.studentId, studentId),
        isNull(behaviorEvent.deletedAt),
        source ? eq(behaviorEvent.source, source) : undefined,
      ),
    )
    .orderBy(desc(behaviorEvent.createdAt), desc(behaviorEvent.id))
    .limit(Math.min(limit, TIMELINE_MAX) + 1);

  const hasMore = rows.length > limit;
  return { items: hasMore ? rows.slice(0, limit) : rows, hasMore };
}

/** "YYYY-MM-DD" of an instant in the given time zone. */
export const localDay = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

export type DaySummary = { day: string; positive: number; negative: number };

/**
 * Positive and negative points per day for the last 7 days (today included), in the school's
 * time zone. Days without events are 0. Call only after assertTeacherOfStudent or assertParentOfStudent.
 */
export async function getLast7Days(db: Db, studentId: string, timeZone: string, now = new Date()) {
  const days = Array.from({ length: 7 }, (_, i) => localDay(new Date(now.getTime() - (6 - i) * 86_400_000), timeZone));
  // Generous lower bound; exact day bucketing happens in the time zone below.
  const since = new Date(now.getTime() - 8 * 86_400_000);
  const localDate = sql<string>`to_char(${behaviorEvent.createdAt} at time zone ${timeZone}, 'YYYY-MM-DD')`;

  const rows = await db
    .select({
      day: localDate,
      positive: sql<number>`coalesce(sum(${behaviorEvent.balanceDelta}) filter (where ${behaviorEvent.balanceDelta} > 0), 0)::int`,
      negative: sql<number>`coalesce(-sum(${behaviorEvent.balanceDelta}) filter (where ${behaviorEvent.balanceDelta} < 0), 0)::int`,
    })
    .from(behaviorEvent)
    .where(
      and(
        eq(behaviorEvent.studentId, studentId),
        isNull(behaviorEvent.deletedAt),
        gte(behaviorEvent.createdAt, since),
      ),
    )
    // By position: the time zone is bound as a separate parameter in each clause, so Postgres
    // would not treat a repeated expression as the same one.
    .groupBy(sql`1`);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  return days.map((day): DaySummary => ({
    day,
    positive: byDay.get(day)?.positive ?? 0,
    negative: byDay.get(day)?.negative ?? 0,
  }));
}
