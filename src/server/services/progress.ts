import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db, Tx } from "@/server/db";
import { parentStudent, schoolClass, stage, student, studentProgress, subject, topic } from "@/server/db/schema";
import { progressKey, type ProgressState } from "@/lib/progress";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import type { BulkSetProgressInput, SetProgressInput } from "@/server/validation/progress";
import { writeAudit } from "./audit";
import { withStages } from "./character";
import { getCurriculum, type SubjectNode } from "./curriculum";

/** The stage must be live (it and its parents not archived) and belong to the class. */
async function assertLiveStageOfClass(tx: Tx | Db, classId: string, stageId: string) {
  const [row] = await tx
    .select({ schoolId: schoolClass.schoolId, gradeLevel: subject.gradeLevel })
    .from(stage)
    .innerJoin(topic, eq(topic.id, stage.topicId))
    .innerJoin(subject, eq(subject.id, topic.subjectId))
    .innerJoin(schoolClass, eq(schoolClass.id, subject.classId))
    .where(
      and(
        eq(stage.id, stageId),
        eq(subject.classId, classId),
        isNull(stage.archivedAt),
        isNull(topic.archivedAt),
        isNull(subject.archivedAt),
      ),
    );
  if (!row) throw forbidden();
  return row;
}

/** Active students of the class; for a grade-specific subject only that grade's students. */
const activeStudentsOf = (classId: string, gradeLevel: number | null = null) =>
  and(
    eq(student.classId, classId),
    eq(student.active, true),
    isNull(student.deletedAt),
    gradeLevel === null ? undefined : eq(student.gradeLevel, gradeLevel),
  );

/** Subjects a student follows: shared ones and those of the student's own grade. */
export const subjectsForGrade = <T extends { gradeLevel: number | null }>(subjects: T[], gradeLevel: number) =>
  subjects.filter((s) => s.gradeLevel === null || s.gradeLevel === gradeLevel);

/** Call only after assertTeacherOfClass. */
export async function getClassMatrix(db: Db, classId: string, subjectId: string) {
  const tree = await getCurriculum(db, classId);
  const current = tree.find((s) => s.id === subjectId);
  if (!current) throw forbidden();

  const students = await db
    .select({ id: student.id, firstName: student.firstName, lastInitial: student.lastInitial })
    .from(student)
    .where(activeStudentsOf(classId, current.gradeLevel));

  const stageIds = current.topics.flatMap((t) => t.stages.map((s) => s.id));
  const rows =
    stageIds.length === 0 || students.length === 0
      ? []
      : await db
          .select()
          .from(studentProgress)
          .where(
            and(
              inArray(studentProgress.stageId, stageIds),
              inArray(
                studentProgress.studentId,
                students.map((s) => s.id),
              ),
            ),
          );

  const progress: Record<string, ProgressState> = {};
  for (const r of rows) progress[progressKey(r.studentId, r.stageId)] = { status: r.status, stars: r.stars };

  // Turkish alphabetical order (Ç, Ğ, İ, Ö, Ş, Ü) is not what the DB collation gives.
  students.sort((a, b) => a.firstName.localeCompare(b.firstName, "tr"));
  return { subjects: tree.map(({ id, name, gradeLevel }) => ({ id, name, gradeLevel })), subject: current, students, progress };
}

/** Sets one cell. "not_started" removes the row; stars only survive on completed stages. */
export async function setProgress(db: Db, actor: AuthUser, classId: string, input: SetProgressInput, ip?: string | null) {
  await db.transaction(async (tx) => {
    const { schoolId, gradeLevel } = await assertLiveStageOfClass(tx, classId, input.stageId);
    const [member] = await tx
      .select({ id: student.id })
      .from(student)
      .where(and(eq(student.id, input.studentId), activeStudentsOf(classId, gradeLevel)));
    if (!member) throw forbidden();

    const where = and(eq(studentProgress.studentId, input.studentId), eq(studentProgress.stageId, input.stageId));
    if (input.status === "not_started") {
      await tx.delete(studentProgress).where(where);
    } else {
      const stars = input.status === "completed" ? (input.stars ?? null) : null;
      await tx
        .insert(studentProgress)
        .values({ studentId: input.studentId, stageId: input.stageId, status: input.status, stars, updatedById: actor.id })
        .onConflictDoUpdate({
          target: [studentProgress.studentId, studentProgress.stageId],
          set: { status: input.status, stars, updatedById: actor.id, updatedAt: new Date() },
        });
    }
    await writeAudit(tx, {
      action: "progress.set",
      entity: "student_progress",
      entityId: progressKey(input.studentId, input.stageId),
      actorId: actor.id,
      schoolId,
      data: { status: input.status, stars: input.stars ?? null },
      ip,
    });
  });
}

/**
 * Sets one stage for many students, all or nothing. "all" means every active student of the class
 * (of the subject's grade, for a grade-specific subject).
 * Existing stars are kept when the status stays "completed". Call only after assertTeacherOfClass.
 */
export async function bulkSetProgress(
  db: Db,
  actor: AuthUser,
  classId: string,
  input: BulkSetProgressInput,
  ip?: string | null,
) {
  return db.transaction(async (tx) => {
    const { schoolId, gradeLevel } = await assertLiveStageOfClass(tx, classId, input.stageId);
    const members = await tx
      .select({ id: student.id })
      .from(student)
      .where(
        input.studentIds === "all"
          ? activeStudentsOf(classId, gradeLevel)
          : and(inArray(student.id, input.studentIds), activeStudentsOf(classId, gradeLevel)),
      );
    const ids = members.map((m) => m.id);
    if (input.studentIds !== "all" && ids.length !== new Set(input.studentIds).size) throw forbidden();

    if (ids.length > 0) {
      if (input.status === "not_started") {
        await tx
          .delete(studentProgress)
          .where(and(eq(studentProgress.stageId, input.stageId), inArray(studentProgress.studentId, ids)));
      } else {
        await tx
          .insert(studentProgress)
          .values(ids.map((studentId) => ({ studentId, stageId: input.stageId, status: input.status, updatedById: actor.id })))
          .onConflictDoUpdate({
            target: [studentProgress.studentId, studentProgress.stageId],
            set: {
              status: input.status,
              stars: sql`case when excluded.status = 'completed' then ${studentProgress.stars} else null end`,
              updatedById: actor.id,
              updatedAt: new Date(),
            },
          });
      }
    }
    await writeAudit(tx, {
      action: "progress.bulk_set",
      entity: "stage",
      entityId: input.stageId,
      actorId: actor.id,
      schoolId,
      data: { status: input.status, studentIds: ids },
      ip,
    });
    return { count: ids.length };
  });
}

export type RoadmapStage = { id: string; name: string } & ProgressState;
export type RoadmapSubject = Omit<SubjectNode, "topics"> & {
  topics: { id: string; name: string; stages: RoadmapStage[] }[];
  completed: number;
  total: number;
};

/**
 * The child's roadmap for a parent. Goes through parent_student (CLAUDE.md rule 3), so a
 * parent who is not linked gets FORBIDDEN and never sees another child's data.
 */
export async function getRoadmapForParent(db: Db, parentId: string, studentId: string) {
  const [child] = await db
    .select({
      id: student.id,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
      classId: student.classId,
      gradeLevel: student.gradeLevel,
      characterTypeId: student.characterTypeId,
      characterLevel: student.characterLevel,
    })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .where(and(eq(parentStudent.parentId, parentId), eq(parentStudent.studentId, studentId), isNull(student.deletedAt)));
  if (!child) throw forbidden();

  const tree = subjectsForGrade(await getCurriculum(db, child.classId), child.gradeLevel);
  const rows = await db.select().from(studentProgress).where(eq(studentProgress.studentId, child.id));
  const byStage = new Map(rows.map((r) => [r.stageId, r]));

  const subjects: RoadmapSubject[] = tree.map((s) => {
    const topics = s.topics.map((t) => ({
      id: t.id,
      name: t.name,
      stages: t.stages.map((st): RoadmapStage => {
        const p = byStage.get(st.id);
        return { id: st.id, name: st.name, status: p?.status ?? "not_started", stars: p?.stars ?? null };
      }),
    }));
    const all = topics.flatMap((t) => t.stages);
    return { id: s.id, name: s.name, gradeLevel: s.gradeLevel, topics, completed: all.filter((x) => x.status === "completed").length, total: all.length };
  });

  // The child's character stands on the "şu an burada" stop of the adventure map.
  const [withStage] = await withStages(db, [child]);
  return { child: { id: child.id, firstName: child.firstName, lastInitial: child.lastInitial, stage: withStage!.stage }, subjects };
}
