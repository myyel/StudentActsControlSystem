import { asc, eq } from "drizzle-orm";
import type { Db, DbOrTx } from "@/server/db";
import { classActivity, school, schoolClass } from "@/server/db/schema";
import type { Activity } from "@/lib/activity";
import type { AuthUser } from "@/server/auth/guards";
import { forbidden } from "@/server/auth/errors";
import { writeAudit } from "./audit";

/** The class's weekly activity times (HH:MM) and the school time zone they are read in. Call only after assertTeacherOfClass. */
export async function getClassActivities(db: DbOrTx, classId: string) {
  const [cls] = await db
    .select({ timeZone: school.timezone })
    .from(schoolClass)
    .innerJoin(school, eq(school.id, schoolClass.schoolId))
    .where(eq(schoolClass.id, classId));
  if (!cls) throw forbidden();
  const rows = await db
    .select({ weekday: classActivity.weekday, time: classActivity.time, name: classActivity.name })
    .from(classActivity)
    .where(eq(classActivity.classId, classId))
    .orderBy(asc(classActivity.weekday));
  return { timeZone: cls.timeZone, activities: rows.map((r) => ({ ...r, time: r.time.slice(0, 5) })) };
}

/** Replaces the whole week (days left out have no alarm). Call only after assertTeacherOfClass. */
export async function setClassActivities(db: Db, actor: AuthUser, classId: string, activities: Activity[], ip?: string | null) {
  await db.transaction(async (tx) => {
    const [cls] = await tx.select({ schoolId: schoolClass.schoolId }).from(schoolClass).where(eq(schoolClass.id, classId));
    if (!cls) throw forbidden();
    await tx.delete(classActivity).where(eq(classActivity.classId, classId));
    if (activities.length > 0) await tx.insert(classActivity).values(activities.map((a) => ({ classId, ...a })));
    await writeAudit(tx, {
      action: "class.activities_update",
      entity: "class",
      entityId: classId,
      actorId: actor.id,
      schoolId: cls.schoolId,
      data: { activities },
      ip,
    });
  });
}
