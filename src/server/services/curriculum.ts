import { and, asc, eq, inArray, isNotNull, isNull, max } from "drizzle-orm";
import type { Db, DbOrTx } from "@/server/db";
import { schoolClass, stage, subject, topic } from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import { UserError } from "@/server/action-result";
import { writeAudit } from "./audit";

export type NodeKind = "subject" | "topic" | "stage";

const ordered = <T extends typeof subject | typeof topic | typeof stage>(t: T) => [asc(t.sortOrder), asc(t.createdAt)];

export type StageNode = { id: string; name: string };
export type TopicNode = { id: string; name: string; stages: StageNode[] };
export type SubjectNode = { id: string; name: string; topics: TopicNode[] };

/** Ordered subject → topic → stage tree of a class. Archived nodes (and their children) are left out. */
export async function getCurriculum(db: DbOrTx, classId: string): Promise<SubjectNode[]> {
  const subjects = await db
    .select({ id: subject.id, name: subject.name })
    .from(subject)
    .where(and(eq(subject.classId, classId), isNull(subject.archivedAt)))
    .orderBy(...ordered(subject));
  if (subjects.length === 0) return [];

  const topics = await db
    .select({ id: topic.id, name: topic.name, subjectId: topic.subjectId })
    .from(topic)
    .where(and(inArray(topic.subjectId, subjects.map((s) => s.id)), isNull(topic.archivedAt)))
    .orderBy(...ordered(topic));
  const stages =
    topics.length === 0
      ? []
      : await db
          .select({ id: stage.id, name: stage.name, topicId: stage.topicId })
          .from(stage)
          .where(and(inArray(stage.topicId, topics.map((t) => t.id)), isNull(stage.archivedAt)))
          .orderBy(...ordered(stage));

  return subjects.map((s) => ({
    ...s,
    topics: topics
      .filter((t) => t.subjectId === s.id)
      .map((t) => ({
        id: t.id,
        name: t.name,
        stages: stages.filter((st) => st.topicId === t.id).map(({ id, name }) => ({ id, name })),
      })),
  }));
}

export type ArchivedNode = { kind: NodeKind; id: string; name: string; path: string };

/** Archived nodes whose parents are still live, so restoring them makes them visible again. */
export async function getArchivedNodes(db: Db, classId: string): Promise<ArchivedNode[]> {
  const subjects = await db
    .select({ id: subject.id, name: subject.name })
    .from(subject)
    .where(and(eq(subject.classId, classId), isNotNull(subject.archivedAt)));
  const topics = await db
    .select({ id: topic.id, name: topic.name, parent: subject.name })
    .from(topic)
    .innerJoin(subject, eq(subject.id, topic.subjectId))
    .where(and(eq(subject.classId, classId), isNull(subject.archivedAt), isNotNull(topic.archivedAt)));
  const stages = await db
    .select({ id: stage.id, name: stage.name, topicName: topic.name, subjectName: subject.name })
    .from(stage)
    .innerJoin(topic, eq(topic.id, stage.topicId))
    .innerJoin(subject, eq(subject.id, topic.subjectId))
    .where(
      and(
        eq(subject.classId, classId),
        isNull(subject.archivedAt),
        isNull(topic.archivedAt),
        isNotNull(stage.archivedAt),
      ),
    );
  return [
    ...subjects.map((s) => ({ kind: "subject" as const, id: s.id, name: s.name, path: "" })),
    ...topics.map((t) => ({ kind: "topic" as const, id: t.id, name: t.name, path: t.parent })),
    ...stages.map((s) => ({ kind: "stage" as const, id: s.id, name: s.name, path: `${s.subjectName} › ${s.topicName}` })),
  ];
}

/** The class a node (or a would-be parent) belongs to, so callers can run assertTeacherOfClass. */
export async function getNodeClassId(db: DbOrTx, kind: NodeKind, id: string): Promise<string> {
  let row: { classId: string } | undefined;
  if (kind === "subject") {
    [row] = await db.select({ classId: subject.classId }).from(subject).where(eq(subject.id, id));
  } else if (kind === "topic") {
    [row] = await db
      .select({ classId: subject.classId })
      .from(topic)
      .innerJoin(subject, eq(subject.id, topic.subjectId))
      .where(eq(topic.id, id));
  } else {
    [row] = await db
      .select({ classId: subject.classId })
      .from(stage)
      .innerJoin(topic, eq(topic.id, stage.topicId))
      .innerJoin(subject, eq(subject.id, topic.subjectId))
      .where(eq(stage.id, id));
  }
  if (!row) throw forbidden();
  return row.classId;
}

/** Parent of each kind: a subject's parent is the class itself. */
export const PARENT_KIND: Record<NodeKind, "class" | NodeKind> = { subject: "class", topic: "subject", stage: "topic" };

export async function getParentClassId(db: DbOrTx, kind: NodeKind, parentId: string) {
  const parentKind = PARENT_KIND[kind];
  if (parentKind !== "class") return getNodeClassId(db, parentKind, parentId);
  const [row] = await db.select({ id: schoolClass.id }).from(schoolClass).where(eq(schoolClass.id, parentId));
  if (!row) throw forbidden();
  return row.id;
}

async function schoolIdOf(db: DbOrTx, classId: string) {
  const [row] = await db.select({ schoolId: schoolClass.schoolId }).from(schoolClass).where(eq(schoolClass.id, classId));
  return row?.schoolId ?? null;
}

/** Live (non-archived) children of a parent, in order. */
async function liveChildren(db: DbOrTx, kind: NodeKind, parentId: string) {
  if (kind === "subject") {
    return db.select({ id: subject.id }).from(subject).where(and(eq(subject.classId, parentId), isNull(subject.archivedAt))).orderBy(...ordered(subject));
  }
  if (kind === "topic") {
    return db.select({ id: topic.id }).from(topic).where(and(eq(topic.subjectId, parentId), isNull(topic.archivedAt))).orderBy(...ordered(topic));
  }
  return db.select({ id: stage.id }).from(stage).where(and(eq(stage.topicId, parentId), isNull(stage.archivedAt))).orderBy(...ordered(stage));
}

/** Call only after assertTeacherOfClass on getParentClassId. New nodes go last. */
export async function createNode(db: Db, actor: AuthUser, kind: NodeKind, parentId: string, name: string, ip?: string | null) {
  return db.transaction(async (tx) => {
    const classId = await getParentClassId(tx, kind, parentId);
    const next = (last: { n: number | null } | undefined) => (last?.n ?? -1) + 1;
    let created: { id: string } | undefined;
    if (kind === "subject") {
      const [last] = await tx.select({ n: max(subject.sortOrder) }).from(subject).where(eq(subject.classId, parentId));
      [created] = await tx.insert(subject).values({ classId: parentId, name, sortOrder: next(last) }).returning({ id: subject.id });
    } else if (kind === "topic") {
      const [last] = await tx.select({ n: max(topic.sortOrder) }).from(topic).where(eq(topic.subjectId, parentId));
      [created] = await tx.insert(topic).values({ subjectId: parentId, name, sortOrder: next(last) }).returning({ id: topic.id });
    } else {
      const [last] = await tx.select({ n: max(stage.sortOrder) }).from(stage).where(eq(stage.topicId, parentId));
      [created] = await tx.insert(stage).values({ topicId: parentId, name, sortOrder: next(last) }).returning({ id: stage.id });
    }
    if (!created) throw new Error("Curriculum insert returned no row");
    const { id } = created;
    await writeAudit(tx, {
      action: "curriculum.create",
      entity: kind,
      entityId: id,
      actorId: actor.id,
      schoolId: await schoolIdOf(tx, classId),
      data: { name, parentId },
      ip,
    });
    return id;
  });
}

const tableOf = { subject, topic, stage } as const;

/** Call only after assertTeacherOfClass on getNodeClassId. */
export async function renameNode(db: Db, actor: AuthUser, kind: NodeKind, id: string, name: string, ip?: string | null) {
  await db.transaction(async (tx) => {
    const t = tableOf[kind];
    const [row] = await tx.update(t).set({ name }).where(eq(t.id, id)).returning({ id: t.id });
    if (!row) throw forbidden();
    await writeAudit(tx, {
      action: "curriculum.update",
      entity: kind,
      entityId: id,
      actorId: actor.id,
      schoolId: await schoolIdOf(tx, await getNodeClassId(tx, kind, id)),
      data: { name },
      ip,
    });
  });
}

/** Archive or restore; progress rows are kept either way. Call only after assertTeacherOfClass. */
export async function setNodeArchived(
  db: Db,
  actor: AuthUser,
  kind: NodeKind,
  id: string,
  archived: boolean,
  ip?: string | null,
) {
  await db.transaction(async (tx) => {
    const t = tableOf[kind];
    const [row] = await tx
      .update(t)
      .set({ archivedAt: archived ? new Date() : null })
      .where(eq(t.id, id))
      .returning({ id: t.id });
    if (!row) throw forbidden();
    await writeAudit(tx, {
      action: archived ? "curriculum.archive" : "curriculum.restore",
      entity: kind,
      entityId: id,
      actorId: actor.id,
      schoolId: await schoolIdOf(tx, await getNodeClassId(tx, kind, id)),
      ip,
    });
  });
}

/**
 * Sets the order of a parent's live children. The ids must be exactly those children,
 * so a stale or foreign list cannot move nodes it does not own. Call only after assertTeacherOfClass.
 */
export async function reorderChildren(
  db: Db,
  actor: AuthUser,
  kind: NodeKind,
  parentId: string,
  orderedIds: string[],
  ip?: string | null,
) {
  await db.transaction(async (tx) => {
    const current = (await liveChildren(tx, kind, parentId)).map((c) => c.id);
    const same =
      current.length === orderedIds.length &&
      new Set(orderedIds).size === orderedIds.length &&
      orderedIds.every((id) => current.includes(id));
    if (!same) throw new UserError("Liste değişmiş. Sayfayı yenileyip tekrar deneyin.");

    const t = tableOf[kind];
    for (const [index, id] of orderedIds.entries()) {
      await tx.update(t).set({ sortOrder: index }).where(eq(t.id, id));
    }
    await writeAudit(tx, {
      action: "curriculum.reorder",
      entity: kind,
      entityId: parentId,
      actorId: actor.id,
      schoolId: await schoolIdOf(tx, await getParentClassId(tx, kind, parentId)),
      data: { orderedIds },
      ip,
    });
  });
}
