import { and, asc, count, eq, isNull } from "drizzle-orm";
import type { Db } from "@/server/db";
import { classTeacher, schoolClass, student } from "@/server/db/schema";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import type { CreateClassInput } from "@/server/validation/class";
import { writeAudit } from "./audit";
import { seedDefaultBehaviorTypes } from "./behavior-type";

/** Creates a class in the teacher's own school and assigns the teacher to it. */
export async function createClass(db: Db, teacher: AuthUser, input: CreateClassInput, ip?: string | null) {
  if (teacher.role !== "teacher" || !teacher.schoolId) throw forbidden();
  const schoolId = teacher.schoolId;

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(schoolClass)
      .values({ schoolId, name: input.name, gradeLevel: input.gradeLevel, academicYear: input.academicYear })
      .returning();
    if (!created) throw new Error("Class insert returned no row");

    await tx.insert(classTeacher).values({ classId: created.id, userId: teacher.id });
    await seedDefaultBehaviorTypes(tx, created.id);
    await writeAudit(tx, {
      action: "class.create",
      entity: "class",
      entityId: created.id,
      actorId: teacher.id,
      schoolId,
      data: { name: created.name },
      ip,
    });
    return created;
  });
}

/** Non-archived classes the teacher is assigned to, with active student counts. */
export async function listClassesForTeacher(db: Db, teacherId: string) {
  return db
    .select({
      id: schoolClass.id,
      name: schoolClass.name,
      gradeLevel: schoolClass.gradeLevel,
      academicYear: schoolClass.academicYear,
      studentCount: count(student.id),
    })
    .from(classTeacher)
    .innerJoin(schoolClass, eq(schoolClass.id, classTeacher.classId))
    .leftJoin(student, and(eq(student.classId, schoolClass.id), isNull(student.deletedAt)))
    .where(and(eq(classTeacher.userId, teacherId), isNull(schoolClass.archivedAt)))
    .groupBy(schoolClass.id)
    .orderBy(asc(schoolClass.name));
}

/** Call only after assertTeacherOfClass. */
export async function getClass(db: Db, classId: string) {
  const [row] = await db.select().from(schoolClass).where(eq(schoolClass.id, classId)).limit(1);
  if (!row) throw forbidden();
  return row;
}

/** Call only after assertTeacherOfClass. */
export async function updateHomeDailyXpCap(db: Db, actor: AuthUser, classId: string, cap: number, ip?: string | null) {
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ cap: schoolClass.homeDailyXpCap, schoolId: schoolClass.schoolId })
      .from(schoolClass)
      .where(eq(schoolClass.id, classId))
      .for("update");
    if (!before) throw forbidden();
    if (before.cap === cap) return;

    await tx.update(schoolClass).set({ homeDailyXpCap: cap }).where(eq(schoolClass.id, classId));
    await writeAudit(tx, {
      action: "class.update",
      entity: "class",
      entityId: classId,
      actorId: actor.id,
      schoolId: before.schoolId,
      data: { homeDailyXpCap: { from: before.cap, to: cap } },
      ip,
    });
  });
}
