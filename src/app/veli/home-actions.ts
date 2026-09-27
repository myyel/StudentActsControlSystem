"use server";

import { refresh } from "next/cache";
import { z } from "@/lib/zod";
import { db } from "@/server/db";
import { forbidden } from "@/server/auth/errors";
import { assertParentOfStudent } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { undoBatch } from "@/server/services/behavior";
import { getHomeBatchStudentId, giveHomeBehavior, type HomeGiveResult } from "@/server/services/home-behavior";
import { giveHomeBehaviorSchema } from "@/server/validation/behavior";

// Order in every action: session → role → ownership → Zod → service.

export async function giveHomeBehaviorAction(studentId: string, payload: unknown): Promise<ActionResult<HomeGiveResult>> {
  try {
    const { user } = await requireRole("parent");
    await assertParentOfStudent(user, studentId);
    const input = giveHomeBehaviorSchema.parse(payload);
    const { ip } = await getRequestMeta();
    const result = await giveHomeBehavior(db, user, studentId, input, ip);
    refresh();
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

/** Only the parent who made the entry, within the undo window (checked in undoBatch). */
export async function undoHomeBatchAction(batchId: string): Promise<ActionResult<{ undone: number }>> {
  try {
    const { user } = await requireRole("parent");
    if (!z.uuid().safeParse(batchId).success) throw forbidden();
    await assertParentOfStudent(user, await getHomeBatchStudentId(db, batchId));
    const { ip } = await getRequestMeta();
    const result = await undoBatch(db, user, batchId, ip);
    refresh();
    return ok(result, "Geri alındı.");
  } catch (error) {
    return toActionError(error);
  }
}
