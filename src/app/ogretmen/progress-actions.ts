"use server";

import { refresh } from "next/cache";
import { db } from "@/server/db";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { bulkSetProgress, setProgress } from "@/server/services/progress";
import { bulkSetProgressSchema, setProgressSchema } from "@/server/validation/progress";

// Order in every action: session → role → ownership → Zod → service.
// The service additionally checks that the stage and students belong to this class.

export async function setProgressAction(classId: string, payload: unknown): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    const input = setProgressSchema.parse(payload);
    const { ip } = await getRequestMeta();
    await setProgress(db, user, classId, input, ip);
    refresh();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function bulkSetProgressAction(classId: string, payload: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    const input = bulkSetProgressSchema.parse(payload);
    const { ip } = await getRequestMeta();
    const result = await bulkSetProgress(db, user, classId, input, ip);
    refresh();
    return ok(result, `${result.count} öğrenci güncellendi.`);
  } catch (error) {
    return toActionError(error);
  }
}
