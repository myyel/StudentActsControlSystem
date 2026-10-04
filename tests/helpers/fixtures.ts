import type { Db } from "@/server/db";
import {
  characterType,
  classTeacher,
  parentStudent,
  school,
  schoolClass,
  student,
  user,
  type UserRole,
} from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/guards";

/**
 * Two schools. School 1 has class A (teacher A), class B (teacher B) and an archived
 * class A-old (teacher A). Parent A has studentA1 (class A) and studentB1 (class B);
 * parent B has studentA2 (class A). deletedStudent (class A) is linked to parent A.
 */
export async function seedAuthFixture(db: Db) {
  const [school1, school2] = await db
    .insert(school)
    .values([{ name: "Okul 1" }, { name: "Okul 2" }])
    .returning();
  const [dragon] = await db.insert(characterType).values({ name: "Ejderha" }).returning();

  async function addUser(email: string, role: UserRole, schoolId: string | null): Promise<AuthUser> {
    const [row] = await db.insert(user).values({ email, name: email, role, schoolId }).returning();
    return { id: row!.id, role: row!.role, schoolId: row!.schoolId };
  }

  const admin1 = await addUser("admin1@test", "admin", school1!.id);
  const admin2 = await addUser("admin2@test", "admin", school2!.id);
  const teacherA = await addUser("teacherA@test", "teacher", school1!.id);
  const teacherB = await addUser("teacherB@test", "teacher", school1!.id);
  const parentA = await addUser("parentA@test", "parent", null);
  const parentB = await addUser("parentB@test", "parent", null);

  const [classA, classB, classAOld] = await db
    .insert(schoolClass)
    .values([
      { schoolId: school1!.id, name: "2-A", gradeLevels: [2], academicYear: "2026-2027" },
      { schoolId: school1!.id, name: "2-B", gradeLevels: [2], academicYear: "2026-2027" },
      {
        schoolId: school1!.id,
        name: "1-A",
        gradeLevels: [1],
        academicYear: "2025-2026",
        archivedAt: new Date(),
      },
    ])
    .returning();

  await db.insert(classTeacher).values([
    { classId: classA!.id, userId: teacherA.id },
    { classId: classB!.id, userId: teacherB.id },
    { classId: classAOld!.id, userId: teacherA.id },
  ]);

  const [studentA1, studentA2, studentB1, studentAOld, deletedStudent] = await db
    .insert(student)
    .values([
      { classId: classA!.id, firstName: "Ada", gradeLevel: 2, characterTypeId: dragon!.id },
      { classId: classA!.id, firstName: "Ali", gradeLevel: 2, characterTypeId: dragon!.id },
      { classId: classB!.id, firstName: "Can", gradeLevel: 2, characterTypeId: dragon!.id },
      { classId: classAOld!.id, firstName: "Efe", gradeLevel: 1, characterTypeId: dragon!.id },
      { classId: classA!.id, firstName: "Ece", gradeLevel: 2, characterTypeId: dragon!.id, deletedAt: new Date() },
    ])
    .returning();

  await db.insert(parentStudent).values([
    { parentId: parentA.id, studentId: studentA1!.id },
    { parentId: parentA.id, studentId: studentB1!.id },
    { parentId: parentA.id, studentId: deletedStudent!.id },
    { parentId: parentB.id, studentId: studentA2!.id },
  ]);

  return {
    school1: school1!,
    school2: school2!,
    users: { admin1, admin2, teacherA, teacherB, parentA, parentB },
    classes: { classA: classA!, classB: classB!, classAOld: classAOld! },
    students: {
      studentA1: studentA1!,
      studentA2: studentA2!,
      studentB1: studentB1!,
      studentAOld: studentAOld!,
      deletedStudent: deletedStudent!,
    },
  };
}
