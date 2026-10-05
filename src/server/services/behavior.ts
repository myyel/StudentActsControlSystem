import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db, Tx } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import { behaviorEvent, behaviorType, schoolClass, student } from "@/server/db/schema";
import { UNDO_WINDOW_MS } from "@/lib/behavior";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import { UserError } from "@/server/action-result";
import type { GiveBehaviorInput } from "@/server/validation/behavior";
import { writeAudit } from "./audit";
import { raiseLevels, type LevelUp } from "./character";
import { notifyBehavior, notifyLevelUps, removeBehaviorNotifications } from "./notification";

export type GiveResult = {
  batchId: string;
  count: number;
  name: string;
  icon: string;
  points: number;
  duplicate: boolean;
  /** Students whose character reached a new level with this batch. */
  levelUps: LevelUp[];
};

/** Server-only: the parent notifications this batch created, for push delivery after commit. */
export type GiveOutcome = GiveResult & { notificationIds: string[] };

async function schoolIdOf(tx: Tx, classId: string) {
  const [row] = await tx.select({ schoolId: schoolClass.schoolId }).from(schoolClass).where(eq(schoolClass.id, classId));
  return row?.schoolId ?? null;
}

/** A batch that was already written (retry or double tap) is returned as-is. */
async function existingBatch(db: Db | Tx, classId: string, batchId: string): Promise<GiveOutcome | null> {
  const rows = await db.select().from(behaviorEvent).where(eq(behaviorEvent.batchId, batchId));
  if (rows.length === 0) return null;
  const first = rows[0]!;
  if (first.classId !== classId) throw forbidden();
  return {
    batchId,
    count: rows.length,
    name: first.nameSnapshot,
    icon: first.iconSnapshot,
    points: first.pointsSnapshot,
    duplicate: true,
    levelUps: [],
    notificationIds: [],
  };
}

/**
 * Scores one or more students of a class with a school behavior, all or nothing.
 * Counters are updated in the same transaction as the events (CLAUDE.md rule 4).
 * Parent notifications are written in the same transaction; pushing them is the caller's job.
 * Call only after assertTeacherOfClass.
 */
export async function giveBehavior(
  db: Db,
  actor: AuthUser,
  classId: string,
  input: GiveBehaviorInput,
  ip?: string | null,
): Promise<GiveOutcome> {
  try {
    return await db.transaction(async (tx) => {
      const previous = await existingBatch(tx, classId, input.batchId);
      if (previous) return previous;

      const [type] = await tx
        .select()
        .from(behaviorType)
        .where(and(eq(behaviorType.id, input.behaviorTypeId), eq(behaviorType.classId, classId)));
      // Teachers score with school behaviors; home behaviors are entered by parents (phase 6).
      if (!type || type.scope !== "school") throw forbidden();
      if (!type.active) throw new UserError("Bu davranış pasif. Davranışlar sayfasından aktif yapabilirsiniz.");

      // Lock in id order so concurrent bulk scorings cannot deadlock.
      const locked = await tx
        .select({
          id: student.id,
          firstName: student.firstName,
          lastInitial: student.lastInitial,
          xp: student.xp,
          characterLevel: student.characterLevel,
          characterTypeId: student.characterTypeId,
        })
        .from(student)
        .where(
          and(
            inArray(student.id, input.studentIds),
            eq(student.classId, classId),
            eq(student.active, true),
            isNull(student.deletedAt),
          ),
        )
        .orderBy(asc(student.id))
        .for("update");
      if (locked.length !== input.studentIds.length) throw forbidden();

      const xpDelta = Math.max(type.points, 0);
      const balanceDelta = type.points;
      // App clock, like the undo window check, so DB/app clock skew cannot shift the window.
      const createdAt = new Date();

      await tx.insert(behaviorEvent).values(
        input.studentIds.map((studentId) => ({
          studentId,
          classId,
          behaviorTypeId: type.id,
          nameSnapshot: type.name,
          iconSnapshot: type.icon,
          pointsSnapshot: type.points,
          xpDelta,
          balanceDelta,
          source: "school" as const,
          givenById: actor.id,
          note: input.note,
          batchId: input.batchId,
          createdAt,
        })),
      );
      await tx
        .update(student)
        .set({ xp: sql`${student.xp} + ${xpDelta}`, balance: sql`${student.balance} + ${balanceDelta}` })
        .where(inArray(student.id, input.studentIds));

      // Same transaction as the counters (CLAUDE.md rule 4); deletes never lower the level.
      const levelUps = xpDelta > 0 ? await raiseLevels(tx, classId, locked.map((s) => ({ ...s, xp: s.xp + xpDelta }))) : [];

      const notificationIds = [
        ...(await notifyBehavior(tx, {
          batchId: input.batchId,
          students: locked,
          name: type.name,
          icon: type.icon,
          points: type.points,
        })),
        ...(await notifyLevelUps(tx, levelUps, locked)),
      ];

      await writeAudit(tx, {
        action: "behavior.give",
        entity: "behavior_event",
        entityId: input.batchId,
        actorId: actor.id,
        schoolId: await schoolIdOf(tx, classId),
        data: {
          behaviorTypeId: type.id,
          points: type.points,
          studentIds: input.studentIds,
          ...(levelUps.length > 0 && {
            levelUps: levelUps.map(({ studentId, fromLevel, toLevel }) => ({ studentId, fromLevel, toLevel })),
          }),
        },
        ip,
      });

      return {
        batchId: input.batchId,
        count: input.studentIds.length,
        name: type.name,
        icon: type.icon,
        points: type.points,
        duplicate: false,
        levelUps,
        notificationIds,
      };
    });
  } catch (error) {
    // Two identical requests raced; the other one won.
    if (isUniqueViolation(error)) {
      const previous = await existingBatch(db, classId, input.batchId);
      if (previous) return previous;
    }
    throw error;
  }
}

type EventRow = typeof behaviorEvent.$inferSelect;

/** Marks events deleted and takes back exactly what they added to the counters. */
async function reverseEvents(tx: Tx, events: EventRow[], actorId: string, reason: "undo" | "delete") {
  const studentIds = [...new Set(events.map((e) => e.studentId))].sort();
  await tx.select({ id: student.id }).from(student).where(inArray(student.id, studentIds)).orderBy(asc(student.id)).for("update");

  for (const e of events) {
    await tx
      .update(behaviorEvent)
      .set({ deletedAt: new Date(), deletedById: actorId, deleteReason: reason })
      .where(eq(behaviorEvent.id, e.id));
    await tx
      .update(student)
      .set({ xp: sql`${student.xp} - ${e.xpDelta}`, balance: sql`${student.balance} - ${e.balanceDelta}` })
      .where(eq(student.id, e.studentId));
  }
}

/** The class of a batch or event, so callers can run assertTeacherOfClass. */
export async function getBatchClassId(db: Db, batchId: string) {
  const [row] = await db.select({ classId: behaviorEvent.classId }).from(behaviorEvent).where(eq(behaviorEvent.batchId, batchId)).limit(1);
  if (!row) throw forbidden();
  return row.classId;
}

export async function getEventClassId(db: Db, eventId: string) {
  const [row] = await db.select({ classId: behaviorEvent.classId }).from(behaviorEvent).where(eq(behaviorEvent.id, eventId));
  if (!row) throw forbidden();
  return row.classId;
}

/**
 * Undo right after scoring: only by the teacher who gave it and within UNDO_WINDOW_MS.
 * Call only after assertTeacherOfClass on the batch's class.
 */
export async function undoBatch(db: Db, actor: AuthUser, batchId: string, ip?: string | null, now = new Date()) {
  return db.transaction(async (tx) => {
    const events = await tx
      .select()
      .from(behaviorEvent)
      .where(and(eq(behaviorEvent.batchId, batchId), isNull(behaviorEvent.deletedAt)))
      .for("update");
    if (events.length === 0) return { undone: 0 };

    const first = events[0]!;
    if (first.givenById !== actor.id) throw forbidden();
    if (now.getTime() - first.createdAt.getTime() > UNDO_WINDOW_MS) {
      throw new UserError(
        actor.role === "parent"
          ? "Geri alma süresi doldu. Yanlış kaydı çocuğunuzun öğretmeni silebilir."
          : "Geri alma süresi doldu. Kaydı öğrencinin zaman çizelgesinden silebilirsiniz.",
      );
    }

    await reverseEvents(tx, events, actor.id, "undo");
    await removeBehaviorNotifications(tx, batchId);
    await writeAudit(tx, {
      action: "behavior.undo",
      entity: "behavior_event",
      entityId: batchId,
      actorId: actor.id,
      schoolId: await schoolIdOf(tx, first.classId),
      data: { eventIds: events.map((e) => e.id) },
      ip,
    });
    return { undone: events.length };
  });
}

/** Deletes one event at any time; a second delete is a no-op. Call only after assertTeacherOfClass. */
export async function deleteEvent(db: Db, actor: AuthUser, eventId: string, ip?: string | null) {
  await db.transaction(async (tx) => {
    const [event] = await tx.select().from(behaviorEvent).where(eq(behaviorEvent.id, eventId)).for("update");
    if (!event) throw forbidden();
    if (event.deletedAt) return;

    await reverseEvents(tx, [event], actor.id, "delete");
    await removeBehaviorNotifications(tx, event.batchId, event.studentId);
    await writeAudit(tx, {
      action: "behavior.delete",
      entity: "behavior_event",
      entityId: eventId,
      actorId: actor.id,
      schoolId: await schoolIdOf(tx, event.classId),
      data: {
        studentId: event.studentId,
        name: event.nameSnapshot,
        points: event.pointsSnapshot,
        createdAt: event.createdAt,
      },
      ip,
    });
  });
}
