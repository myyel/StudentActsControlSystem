import { and, asc, count, eq, max } from "drizzle-orm";
import { DEFAULT_BEHAVIORS } from "@/content/default-behaviors";
import type { Db, DbOrTx } from "@/server/db";
import { behaviorType, schoolClass, type BehaviorScope } from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import type { BehaviorTypeInput } from "@/server/validation/behavior";
import { writeAudit } from "./audit";

const ordered = [asc(behaviorType.sortOrder), asc(behaviorType.createdAt)];

/** Copies the default list into a class. Called when a class is created. */
export async function seedDefaultBehaviorTypes(db: DbOrTx, classId: string) {
  await db.insert(behaviorType).values(DEFAULT_BEHAVIORS.map((b, i) => ({ ...b, classId, sortOrder: i })));
}

/** Call only after assertTeacherOfClass. */
export async function listBehaviorTypes(
  db: DbOrTx,
  classId: string,
  filter: { scope?: BehaviorScope; activeOnly?: boolean } = {},
) {
  const conditions = [eq(behaviorType.classId, classId)];
  if (filter.scope) conditions.push(eq(behaviorType.scope, filter.scope));
  if (filter.activeOnly) conditions.push(eq(behaviorType.active, true));
  return db
    .select()
    .from(behaviorType)
    .where(and(...conditions))
    .orderBy(...ordered);
}

/** The class a behavior type belongs to, so callers can run assertTeacherOfClass. */
export async function getBehaviorTypeClassId(db: Db, typeId: string) {
  const [row] = await db.select({ classId: behaviorType.classId }).from(behaviorType).where(eq(behaviorType.id, typeId));
  if (!row) throw forbidden();
  return row.classId;
}

async function schoolIdOf(db: DbOrTx, classId: string) {
  const [row] = await db.select({ schoolId: schoolClass.schoolId }).from(schoolClass).where(eq(schoolClass.id, classId));
  return row?.schoolId ?? null;
}

/** Call only after assertTeacherOfClass. New types go to the end of their scope. */
export async function createBehaviorType(
  db: Db,
  actor: AuthUser,
  classId: string,
  input: BehaviorTypeInput,
  ip?: string | null,
) {
  return db.transaction(async (tx) => {
    const [last] = await tx
      .select({ sortOrder: max(behaviorType.sortOrder) })
      .from(behaviorType)
      .where(and(eq(behaviorType.classId, classId), eq(behaviorType.scope, input.scope)));
    const [created] = await tx
      .insert(behaviorType)
      .values({ ...input, classId, sortOrder: (last?.sortOrder ?? -1) + 1 })
      .returning();
    await writeAudit(tx, {
      action: "behavior_type.create",
      entity: "behavior_type",
      entityId: created!.id,
      actorId: actor.id,
      schoolId: await schoolIdOf(tx, classId),
      data: input,
      ip,
    });
    return created!;
  });
}

/**
 * Call only after assertTeacherOfClass on the type's class. Changing points does not touch
 * past events: they keep their own snapshot.
 */
export async function updateBehaviorType(
  db: Db,
  actor: AuthUser,
  typeId: string,
  changes: Partial<BehaviorTypeInput & { active: boolean }>,
  ip?: string | null,
) {
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(behaviorType)
      .set(changes)
      .where(eq(behaviorType.id, typeId))
      .returning({ classId: behaviorType.classId });
    if (!updated) throw forbidden();
    await writeAudit(tx, {
      action: "behavior_type.update",
      entity: "behavior_type",
      entityId: typeId,
      actorId: actor.id,
      schoolId: await schoolIdOf(tx, updated.classId),
      data: changes,
      ip,
    });
  });
}

/** Swaps the type with its neighbour within the same class and scope; renumbers the list. */
export async function moveBehaviorType(db: Db, typeId: string, direction: "up" | "down") {
  await db.transaction(async (tx) => {
    const [target] = await tx.select().from(behaviorType).where(eq(behaviorType.id, typeId));
    if (!target) throw forbidden();

    const list = await listBehaviorTypes(tx, target.classId, { scope: target.scope });
    const from = list.findIndex((t) => t.id === typeId);
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to]!, list[from]!];

    for (const [i, t] of list.entries()) {
      if (t.sortOrder !== i) await tx.update(behaviorType).set({ sortOrder: i }).where(eq(behaviorType.id, t.id));
    }
  });
}

/** For classes created before defaults existed; no-op if the class already has types. */
export async function loadDefaultBehaviorTypes(db: Db, classId: string) {
  await db.transaction(async (tx) => {
    const [row] = await tx.select({ n: count() }).from(behaviorType).where(eq(behaviorType.classId, classId));
    if ((row?.n ?? 0) === 0) await seedDefaultBehaviorTypes(tx, classId);
  });
}
