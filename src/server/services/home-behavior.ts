import { and, eq, gte, isNull, sql } from "drizzle-orm";
import type { Db, DbOrTx } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import { behaviorEvent, behaviorType, school, schoolClass, student } from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import { UserError } from "@/server/action-result";
import type { GiveHomeBehaviorInput } from "@/server/validation/behavior";
import { writeAudit } from "./audit";
import type { GiveResult } from "./behavior";
import { raiseLevels } from "./character";
import { localDay } from "./timeline";

export type HomeGiveResult = GiveResult & {
  /** XP this entry added; less than the points when the daily cap was hit. */
  xpAdded: number;
  /** Home XP counted today after this entry, and the class's daily cap. */
  todayXp: number;
  cap: number;
};

/**
 * Home XP already counted today (school time zone) for a student. Undone or deleted
 * entries do not count, so they free the cap again.
 */
export async function homeXpToday(db: DbOrTx, studentId: string, timeZone: string, now = new Date()) {
  const [row] = await db
    .select({ used: sql<number>`coalesce(sum(${behaviorEvent.xpDelta}), 0)::int` })
    .from(behaviorEvent)
    .where(
      and(
        eq(behaviorEvent.studentId, studentId),
        eq(behaviorEvent.source, "home"),
        isNull(behaviorEvent.deletedAt),
        // Index-friendly lower bound; the exact day is compared in the school's time zone.
        gte(behaviorEvent.createdAt, new Date(now.getTime() - 2 * 86_400_000)),
        sql`to_char(${behaviorEvent.createdAt} at time zone ${timeZone}, 'YYYY-MM-DD') = ${localDay(now, timeZone)}`,
      ),
    );
  return row?.used ?? 0;
}

/** How many times each home behavior was marked today (all parents), for the ✓ ×2 stickers. */
export async function homeCountsToday(db: DbOrTx, studentId: string, timeZone: string, now = new Date()) {
  const rows = await db
    .select({ typeId: behaviorEvent.behaviorTypeId, count: sql<number>`count(*)::int` })
    .from(behaviorEvent)
    .where(
      and(
        eq(behaviorEvent.studentId, studentId),
        eq(behaviorEvent.source, "home"),
        isNull(behaviorEvent.deletedAt),
        gte(behaviorEvent.createdAt, new Date(now.getTime() - 2 * 86_400_000)),
        sql`to_char(${behaviorEvent.createdAt} at time zone ${timeZone}, 'YYYY-MM-DD') = ${localDay(now, timeZone)}`,
      ),
    )
    .groupBy(behaviorEvent.behaviorTypeId);
  return Object.fromEntries(rows.filter((r) => r.typeId).map((r) => [r.typeId!, r.count])) as Record<string, number>;
}

async function studentContext(db: DbOrTx, studentId: string, lock: boolean) {
  const query = db
    .select({
      id: student.id,
      classId: student.classId,
      xp: student.xp,
      characterLevel: student.characterLevel,
      characterTypeId: student.characterTypeId,
      active: student.active,
      deletedAt: student.deletedAt,
      schoolId: schoolClass.schoolId,
      cap: schoolClass.homeDailyXpCap,
      timeZone: school.timezone,
    })
    .from(student)
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .innerJoin(school, eq(school.id, schoolClass.schoolId))
    .where(eq(student.id, studentId));
  const [row] = lock ? await query.for("update", { of: student }) : await query;
  if (!row || row.deletedAt) throw forbidden();
  return row;
}

/** A retried entry (double tap, network retry) is returned as-is. */
async function existingEntry(db: DbOrTx, studentId: string, batchId: string, now: Date): Promise<HomeGiveResult | null> {
  const [event] = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, batchId));
  if (!event) return null;
  if (event.studentId !== studentId || event.source !== "home") throw forbidden();
  const ctx = await studentContext(db, studentId, false);
  return {
    batchId,
    count: 1,
    name: event.nameSnapshot,
    icon: event.iconSnapshot,
    points: event.pointsSnapshot,
    duplicate: true,
    levelUps: [],
    xpAdded: event.xpDelta,
    todayXp: await homeXpToday(db, studentId, ctx.timeZone, now),
    cap: ctx.cap,
  };
}

/**
 * A parent marks a home behavior for their child, today. Home behaviors are positive only;
 * the class's daily cap limits the XP only, the balance gets the full points (PRD §4.4, §6).
 * Counters, level and audit share one transaction (CLAUDE.md rule 4).
 * Call only after assertParentOfStudent.
 */
export async function giveHomeBehavior(
  db: Db,
  actor: AuthUser,
  studentId: string,
  input: GiveHomeBehaviorInput,
  ip?: string | null,
  now = new Date(),
): Promise<HomeGiveResult> {
  try {
    return await db.transaction(async (tx) => {
      const previous = await existingEntry(tx, studentId, input.batchId, now);
      if (previous) return previous;

      // The lock serializes entries for one child, so two parents cannot both fill the cap.
      const ctx = await studentContext(tx, studentId, true);
      if (!ctx.active) throw new UserError("Çocuğunuzun kaydı şu an pasif. Öğretmeniyle görüşebilirsiniz.");

      const [type] = await tx
        .select()
        .from(behaviorType)
        .where(and(eq(behaviorType.id, input.behaviorTypeId), eq(behaviorType.classId, ctx.classId)));
      if (!type || type.scope !== "home") throw forbidden();
      if (!type.active) throw new UserError("Bu ev davranışı artık kullanılmıyor.");

      const used = await homeXpToday(tx, studentId, ctx.timeZone, now);
      const xpDelta = Math.max(0, Math.min(type.points, ctx.cap - used));

      await tx.insert(behaviorEvent).values({
        studentId,
        classId: ctx.classId,
        behaviorTypeId: type.id,
        nameSnapshot: type.name,
        iconSnapshot: type.icon,
        pointsSnapshot: type.points,
        xpDelta,
        balanceDelta: type.points,
        source: "home",
        givenById: actor.id,
        batchId: input.batchId,
        createdAt: now,
      });
      await tx
        .update(student)
        .set({ xp: sql`${student.xp} + ${xpDelta}`, balance: sql`${student.balance} + ${type.points}` })
        .where(eq(student.id, studentId));
      const levelUps = xpDelta > 0 ? await raiseLevels(tx, ctx.classId, [{ ...ctx, xp: ctx.xp + xpDelta }]) : [];

      await writeAudit(tx, {
        action: "behavior.give_home",
        entity: "behavior_event",
        entityId: input.batchId,
        actorId: actor.id,
        schoolId: ctx.schoolId,
        data: {
          studentId,
          behaviorTypeId: type.id,
          points: type.points,
          xpDelta,
          ...(levelUps.length > 0 && { levelUp: { fromLevel: levelUps[0]!.fromLevel, toLevel: levelUps[0]!.toLevel } }),
        },
        ip,
      });

      return {
        batchId: input.batchId,
        count: 1,
        name: type.name,
        icon: type.icon,
        points: type.points,
        duplicate: false,
        levelUps,
        xpAdded: xpDelta,
        todayXp: used + xpDelta,
        cap: ctx.cap,
      };
    });
  } catch (error) {
    // Two identical requests raced; the other one won.
    if (isUniqueViolation(error)) {
      const previous = await existingEntry(db, studentId, input.batchId, now);
      if (previous) return previous;
    }
    throw error;
  }
}

/** The student of a home entry, so callers can run assertParentOfStudent. */
export async function getHomeBatchStudentId(db: Db, batchId: string) {
  const [row] = await db
    .select({ studentId: behaviorEvent.studentId })
    .from(behaviorEvent)
    .where(and(eq(behaviorEvent.batchId, batchId), eq(behaviorEvent.source, "home")))
    .limit(1);
  if (!row) throw forbidden();
  return row.studentId;
}
