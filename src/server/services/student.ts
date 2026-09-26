import { and, asc, count, eq, isNull, or } from "drizzle-orm";
import type { Db, DbOrTx } from "@/server/db";
import { characterType, parentStudent, school, schoolClass, student, user } from "@/server/db/schema";
import type { StudentName } from "@/lib/student-names";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import { writeAudit } from "./audit";

const byName = (a: StudentName, b: StudentName) =>
  a.firstName.localeCompare(b.firstName, "tr") || (a.lastInitial ?? "").localeCompare(b.lastInitial ?? "", "tr");

/** First active character type available to the school (school-specific or global). */
async function defaultCharacterTypeId(db: DbOrTx, schoolId: string) {
  const [row] = await db
    .select({ id: characterType.id })
    .from(characterType)
    .where(
      and(
        eq(characterType.active, true),
        or(eq(characterType.schoolId, schoolId), isNull(characterType.schoolId)),
      ),
    )
    .orderBy(asc(characterType.sortOrder))
    .limit(1);
  if (!row) throw new Error("No active character type configured");
  return row.id;
}

/** Call only after assertTeacherOfClass. */
export async function addStudents(
  db: Db,
  actor: AuthUser,
  classId: string,
  names: StudentName[],
  ip?: string | null,
) {
  return db.transaction(async (tx) => {
    const [cls] = await tx
      .select({ schoolId: schoolClass.schoolId })
      .from(schoolClass)
      .where(eq(schoolClass.id, classId));
    if (!cls) throw forbidden();

    const characterTypeId = await defaultCharacterTypeId(tx, cls.schoolId);
    const created = await tx
      .insert(student)
      .values(names.map((n) => ({ classId, firstName: n.firstName, lastInitial: n.lastInitial, characterTypeId })))
      .returning({ id: student.id });

    await writeAudit(tx, {
      action: "student.create",
      entity: "class",
      entityId: classId,
      actorId: actor.id,
      schoolId: cls.schoolId,
      data: { count: created.length, studentIds: created.map((s) => s.id) },
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
  changes: Partial<StudentName & { active: boolean }>,
  ip?: string | null,
) {
  return db.transaction(async (tx) => {
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
      active: student.active,
      xp: student.xp,
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
      firstName: student.firstName,
      lastInitial: student.lastInitial,
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
