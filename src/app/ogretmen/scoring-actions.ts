"use server";

import { refresh } from "next/cache";
import { UNDO_WINDOW_MS } from "@/lib/behavior";
import { z } from "@/lib/zod";
import { db } from "@/server/db";
import { forbidden } from "@/server/auth/errors";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { dispatchPush } from "@/server/push-dispatch";
import { getRequestMeta } from "@/server/request";
import {
  deleteEvent,
  getBatchClassId,
  getEventClassId,
  giveBehavior,
  undoBatch,
  type GiveResult,
} from "@/server/services/behavior";
import { giveBehaviorSchema } from "@/server/validation/behavior";

// Order in every action: session → role → ownership → Zod → service.

export async function giveBehaviorAction(classId: string, payload: unknown): Promise<ActionResult<GiveResult>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    const input = giveBehaviorSchema.parse(payload);
    const { ip } = await getRequestMeta();
    const { notificationIds, ...result } = await giveBehavior(db, user, classId, input, ip);
    // Parents get the push once the undo window is over, and only if the score still stands.
    dispatchPush(notificationIds, { delayMs: UNDO_WINDOW_MS + 2_000 });
    refresh();
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function undoBatchAction(batchId: string): Promise<ActionResult<{ undone: number }>> {
  try {
    const { user } = await requireRole("teacher");
    if (!z.uuid().safeParse(batchId).success) throw forbidden();
    await assertTeacherOfClass(user, await getBatchClassId(db, batchId));
    const { ip } = await getRequestMeta();
    const result = await undoBatch(db, user, batchId, ip);
    refresh();
    return ok(result, "Geri alındı.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteEventAction(eventId: string): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    if (!z.uuid().safeParse(eventId).success) throw forbidden();
    await assertTeacherOfClass(user, await getEventClassId(db, eventId));
    const { ip } = await getRequestMeta();
    await deleteEvent(db, user, eventId, ip);
    refresh();
    return ok(undefined, "Kayıt silindi.");
  } catch (error) {
    return toActionError(error);
  }
}
