"use server";

import { refresh } from "next/cache";
import { db } from "@/server/db";
import { assertParentOfMessage } from "@/server/auth/guards";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { markMessageRead, setMessageReaction } from "@/server/services/message";
import { reactionSchema } from "@/server/validation/message";

// Order in every action: session → role → ownership → Zod → service.

export async function markMessageReadAction(messageId: string): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("parent");
    await assertParentOfMessage(user, messageId);
    await markMessageRead(db, user.id, messageId);
    refresh();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactToMessageAction(messageId: string, reaction: unknown): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("parent");
    await assertParentOfMessage(user, messageId);
    const input = reactionSchema.parse(reaction);
    await setMessageReaction(db, user.id, messageId, input);
    refresh();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}
