import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/server/db";
import { parentStudent, school, schoolClass, student } from "@/server/db/schema";
import { forbidden } from "@/server/auth/errors";
import { getBehaviorWeek } from "./behavior-week";

export { MAX_WEEK_OFFSET } from "./behavior-week";

/**
 * A child's week of behaviors for a parent (see getBehaviorWeek). The child is looked up through
 * parent_student (CLAUDE.md rule 3): an unlinked or deleted child is FORBIDDEN.
 */
export async function getBehaviorWeekForParent(
  db: Db,
  parentId: string,
  studentId: string,
  weekOffset = 0,
  now = new Date(),
) {
  const [child] = await db
    .select({
      id: student.id,
      firstName: student.firstName,
      lastInitial: student.lastInitial,
      timeZone: school.timezone,
    })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .innerJoin(schoolClass, eq(schoolClass.id, student.classId))
    .innerJoin(school, eq(school.id, schoolClass.schoolId))
    .where(and(eq(parentStudent.parentId, parentId), eq(parentStudent.studentId, studentId), isNull(student.deletedAt)));
  if (!child) throw forbidden();

  const week = await getBehaviorWeek(db, child, weekOffset, now);
  return { child: { id: child.id, firstName: child.firstName, lastInitial: child.lastInitial }, ...week };
}
