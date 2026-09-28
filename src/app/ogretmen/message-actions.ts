"use server";

import { refresh } from "next/cache";
import { z } from "@/lib/zod";
import { db } from "@/server/db";
import { forbidden } from "@/server/auth/errors";
import { assertTeacherOfClass } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { dispatchPush } from "@/server/push-dispatch";
import { getRequestMeta } from "@/server/request";
import { deleteMessage, getMessageClassId, sendMessage } from "@/server/services/message";
import { messageSchema } from "@/server/validation/message";

// Order in every action: session → role → ownership → Zod → service.

export async function sendMessageAction(classId: string, payload: unknown): Promise<ActionResult<{ messageId: string }>> {
  try {
    const { user } = await requireRole("teacher");
    await assertTeacherOfClass(user, classId);
    const input = messageSchema.parse(payload);
    const { ip } = await getRequestMeta();
    const { messageId, notificationIds } = await sendMessage(db, user, classId, input, ip);
    dispatchPush(notificationIds);
    refresh();
    return ok({ messageId }, input.studentId ? "Mesaj gönderildi." : "Duyuru gönderildi.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteMessageAction(messageId: string): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("teacher");
    if (!z.uuid().safeParse(messageId).success) throw forbidden();
    await assertTeacherOfClass(user, await getMessageClassId(db, messageId));
    const { ip } = await getRequestMeta();
    await deleteMessage(db, user, messageId, ip);
    refresh();
    return ok(undefined, "Mesaj silindi.");
  } catch (error) {
    return toActionError(error);
  }
}
