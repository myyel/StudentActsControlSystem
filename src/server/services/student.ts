import { and, asc, count, eq, isNull } from "drizzle-orm";
import type { Db, DbOrTx } from "@/server/db";
import { parentStudent, school, schoolClass, student, user } from "@/server/db/schema";
import type { StudentName } from "@/lib/student-names";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import { UserError } from "@/server/action-result";
import { writeAudit } from "./audit";
import { listClassCharacterTypes } from "./character";

const byName = (a: StudentName, b: StudentName) =>
  a.firstName.localeCompare(b.firstName, "tr") || (a.lastInitial ?? "").localeCompare(b.lastInitial ?? "", "tr");

/** First character type the class offers (the teacher's pick, or the school's active types). */
async function defaultCharacterTypeId(db: DbOrTx, classId: string) {
  const [first] = await listClassCharacterTypes(db, classId);
  if (!first) throw new Error("No active character type configured");
  return first.id;
}

/**
 * The grade a student gets in this class: the given one if the class teaches it, or the only
 * level of a single-level class when none is given.
 */
export function resolveGradeLevel(classLevels: number[], gradeLevel: number | null | undefined) {
  if (gradeLevel == null) {
    if (classLevels.length === 1) return classLevels[0]!;
    throw new UserError("Öğrencinin sınıf düzeyini seçin.");
  }
  if (!classLevels.includes(gradeLevel)) throw new UserError("Bu sınıfta o düzey yok.");
  return gradeLevel;
}

/** Call only after assertTeacherOfClass. In a combined class every new student needs a gradeLevel. */
export async function addStudents(
  db: Db,
  actor: AuthUser,
  classId: string,
  names: StudentName[],
  gradeLevel: number | null,
  ip?: string | null,
) {
  return db.transaction(async (tx) => {
    const [cls] = await tx
      .select({ schoolId: schoolClass.schoolId, gradeLevels: schoolClass.gradeLevels })
      .from(schoolClass)
      .where(eq(schoolClass.id, classId));
    if (!cls) throw forbidden();
    const level = resolveGradeLevel(cls.gradeLevels, gradeLevel);

    const characterTypeId = await defaultCharacterTypeId(tx, classId);
    const created = await tx
      .insert(student)
      .values(
        names.map((n) => ({ classId, firstName: n.firstName, lastInitial: n.lastInitial, gradeLevel: level, characterTypeId })),
      )
      .returning({ id: student.id });

    await writeAudit(tx, {
      action: "student.create",
      entity: "class",
      entityId: classId,
      actorId: actor.id,
      schoolId: cls.schoolId,
      data: { count: created.length, gradeLevel: level, studentIds: created.map((s) => s.id) },
      ip,
    });
    return created;
  });
}

/** Call only after assertTeacherOfStudent. */
export async function updateStudent(
  db: Db,
  actor: AuthUser,
  studentId: string,
  changes: Partial<StudentName & { active: boolean; gradeLevel: number }>,
  ip?: string | null,
) {
  return db.transaction(async (tx) => {
    if (changes.gradeLevel !== undefined) {
      const [current] = await tx
        .select({ gradeLevels: schoolClass.gradeLevels })
        .from(student)
        .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
        .where(eq(student.id, studentId));
      if (!current) throw forbidden();
      resolveGradeLevel(current.gradeLevels, changes.gradeLevel);
    }
    const [updated] = await tx
      .update(student)
      .set(changes)
      .where(eq(student.id, studentId))
      .returning({ id: student.id, classId: student.classId });
    if (!updated) throw forbidden();

    const [cls] = await tx
      .select({ schoolId: schoolClass.schoolId })
      .from(schoolClass)
      .where(eq(schoolClass.id, updated.classId));
    await writeAudit(tx, {
      action: "student.update",
      entity: "student",
      entityId: studentId,
      actorId: actor.id,
      schoolId: cls?.schoolId,
      data: changes,
      ip,
    });
  });
}

/** Call only after assertTeacherOfClass. Excludes deleted students. */
export async function listStudentsForClass(db: Db, classId: string) {
  const rows = await db
    .select({
      id: student.id,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
      gradeLevel: student.gradeLevel,
      active: student.active,
      xp: student.xp,
      characterTypeId: student.characterTypeId,
      characterLevel: student.characterLevel,
      parentCount: count(parentStudent.parentId),
    })
    .from(student)
    .leftJoin(parentStudent, eq(parentStudent.studentId, student.id))
    .where(and(eq(student.classId, classId), isNull(student.deletedAt)))
    .groupBy(student.id);
  return rows.sort(byName);
}

/** Call only after assertTeacherOfStudent. */
export async function getStudentForTeacher(db: Db, studentId: string) {
  const [row] = await db
    .select({
      id: student.id,
      classId: student.classId,
      className: schoolClass.name,
      classGradeLevels: schoolClass.gradeLevels,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
      gradeLevel: student.gradeLevel,
      active: student.active,
      xp: student.xp,
      balance: student.balance,
      timeZone: school.timezone,
    })
    .from(student)
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .innerJoin(school, eq(school.id, schoolClass.schoolId))
    .where(eq(student.id, studentId));
  if (!row) throw forbidden();

  const parents = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      relation: parentStudent.relation,
      linkedAt: parentStudent.createdAt,
    })
    .from(parentStudent)
    .innerJoin(user, eq(user.id, parentStudent.parentId))
    .where(eq(parentStudent.studentId, studentId))
    .orderBy(asc(parentStudent.createdAt));

  return { ...row, parents };
}
