"use server";

import { refresh } from "next/cache";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { setClassActivities } from "@/server/services/class-activity";
import { classActivitiesSchema } from "@/server/validation/class";

// Order in every action: session → role → ownership → Zod → service.

export async function setClassActivitiesAction(classId: string, activities: unknown): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    const input = classActivitiesSchema.parse({ activities });
    const { ip } = await getRequestMeta();
    await setClassActivities(db, user, classId, input.activities, ip);
    refresh();
    return ok(undefined, "Etkinlik saatleri kaydedildi.");
  } catch (error) {
    return toActionError(error);
  }
}
