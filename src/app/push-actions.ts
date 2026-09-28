"use server";

import { db } from "@/server/db";
import { requireSession } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { removeSubscription } from "@/server/services/push";
import { endpointSchema } from "@/server/validation/notification";

/**
 * Removes this browser's subscription from the session user (turning push off, or signing out
 * so a shared device stops getting this user's notifications). Any role may call it.
 */
export async function removePushSubscriptionAction(endpoint: unknown): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireSession();
    await removeSubscription(db, user.id, endpointSchema.parse(endpoint));
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}
