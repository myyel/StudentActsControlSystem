import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { classTeacher, parentStudent, schoolClass, student, type UserRole } from "@/server/db/schema";
import { forbidden } from "./errors";

/** The subset of the session user that authorization decisions depend on. */
export type AuthUser = {
  id: string;
  role: UserRole;
  schoolId?: string | null;
};

const uuidSchema = z.uuid();

// Ids arrive from URLs and forms; a malformed id must be a 403, not a Postgres cast error.
function assertUuid(id: string) {
  if (!uuidSchema.safeParse(id).success) throw forbidden();
}

export function assertRole(user: AuthUser, ...roles: UserRole[]) {
  if (!roles.includes(user.role)) throw forbidden();
}

export function assertAdminOfSchool(user: AuthUser, schoolId: string) {
  assertRole(user, "admin");
  if (!user.schoolId || user.schoolId !== schoolId) throw forbidden();
}

/** Teacher is assigned to the class and the class is not archived. */
export async function assertTeacherOfClass(user: AuthUser, classId: string) {
  assertRole(user, "teacher");
  assertUuid(classId);

  const [row] = await db
    .select({ id: schoolClass.id })
    .from(classTeacher)
    .innerJoin(schoolClass, eq(schoolClass.id, classTeacher.classId))
    .where(
      and(
        eq(classTeacher.userId, user.id),
        eq(classTeacher.classId, classId),
        isNull(schoolClass.archivedAt),
      ),
    )
    .limit(1);

  if (!row) throw forbidden();
}

/** Teacher is assigned to the student's (non-archived) class and the student is not deleted. */
export async function assertTeacherOfStudent(user: AuthUser, studentId: string) {
  assertRole(user, "teacher");
  assertUuid(studentId);

  const [row] = await db
    .select({ id: student.id })
    .from(student)
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .innerJoin(classTeacher, eq(classTeacher.classId, student.classId))
    .where(
      and(
        eq(student.id, studentId),
        eq(classTeacher.userId, user.id),
        isNull(student.deletedAt),
        isNull(schoolClass.archivedAt),
      ),
    )
    .limit(1);

  if (!row) throw forbidden();
}

/** Parent is linked to the student and the student is not deleted. */
export async function assertParentOfStudent(user: AuthUser, studentId: string) {
  assertRole(user, "parent");
  assertUuid(studentId);

  const [row] = await db
    .select({ id: student.id })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .where(
      and(
        eq(parentStudent.parentId, user.id),
        eq(parentStudent.studentId, studentId),
        isNull(student.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw forbidden();
}
