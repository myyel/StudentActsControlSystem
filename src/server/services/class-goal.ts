import { and, eq, gt, gte, isNull, sql } from "drizzle-orm";
import type { Db, DbOrTx } from "@/server/db";
import { behaviorEvent, classGoal, schoolClass } from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import type { ClassGoalInput } from "@/server/validation/class";
import { writeAudit } from "./audit";

export type ClassGoalView = { id: string; title: string; target: number; value: number };

/**
 * The class's open goal and how far the class got: positive school points since the goal
 * started. Negative points never lower it (a child's mistake must not set the class back);
 * undone or deleted events drop out on their own. A class total only, never per child.
 * Call only after assertTeacherOfClass.
 */
export async function getClassGoal(db: DbOrTx, classId: string): Promise<ClassGoalView | null> {
  const [goal] = await db
    .select()
    .from(classGoal)
    .where(and(eq(classGoal.classId, classId), isNull(classGoal.endedAt)));
  if (!goal) return null;
  const [row] = await db
    .select({ value: sql<number>`coalesce(sum(${behaviorEvent.pointsSnapshot}), 0)::int` })
    .from(behaviorEvent)
    .where(
      and(
        eq(behaviorEvent.classId, classId),
        eq(behaviorEvent.source, "school"),
        gt(behaviorEvent.pointsSnapshot, 0),
        isNull(behaviorEvent.deletedAt),
        gte(behaviorEvent.createdAt, goal.startedAt),
      ),
    );
  return { id: goal.id, title: goal.title, target: goal.target, value: row?.value ?? 0 };
}

async function schoolOf(tx: DbOrTx, classId: string) {
  const [cls] = await tx.select({ schoolId: schoolClass.schoolId }).from(schoolClass).where(eq(schoolClass.id, classId));
  if (!cls) throw forbidden();
  return cls.schoolId;
}

/** Starts a new goal (counting from zero); an open one is ended. Call only after assertTeacherOfClass. */
export async function setClassGoal(db: Db, actor: AuthUser, classId: string, input: ClassGoalInput, ip?: string | null) {
  return db.transaction(async (tx) => {
    const schoolId = await schoolOf(tx, classId);
    await tx
      .update(classGoal)
      .set({ endedAt: new Date() })
      .where(and(eq(classGoal.classId, classId), isNull(classGoal.endedAt)));
    const [created] = await tx
      .insert(classGoal)
      .values({ classId, title: input.title, target: input.target, createdById: actor.id })
      .returning();
    await writeAudit(tx, {
      action: "class_goal.set",
      entity: "class",
      entityId: classId,
      actorId: actor.id,
      schoolId,
      data: { title: input.title, target: input.target },
      ip,
    });
    return created!;
  });
}

/** Ends the open goal (e.g. the reward was given). Call only after assertTeacherOfClass. */
export async function endClassGoal(db: Db, actor: AuthUser, classId: string, ip?: string | null) {
  await db.transaction(async (tx) => {
    const schoolId = await schoolOf(tx, classId);
    const ended = await tx
      .update(classGoal)
      .set({ endedAt: new Date() })
      .where(and(eq(classGoal.classId, classId), isNull(classGoal.endedAt)))
      .returning({ id: classGoal.id });
    if (ended.length === 0) return;
    await writeAudit(tx, { action: "class_goal.end", entity: "class", entityId: classId, actorId: actor.id, schoolId, ip });
  });
}
