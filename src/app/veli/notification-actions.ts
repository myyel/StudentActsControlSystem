"use server";

import { refresh } from "next/cache";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/session";
import { ok, toActionError, type ActionResult } from "@/server/action-result";
import { getRequestMeta } from "@/server/request";
import { markAllNotificationsRead, setPreference } from "@/server/services/notification";
import { hasSubscription, saveSubscription } from "@/server/services/push";
import { endpointSchema, preferenceSchema, pushSubscriptionSchema } from "@/server/validation/notification";

// Order in every action: session → role → ownership → Zod → service.
// Notifications, preferences and subscriptions are always scoped to the session user.

export async function markAllNotificationsReadAction(): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("parent");
    await markAllNotificationsRead(db, user.id);
    refresh();
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function setPreferenceAction(payload: unknown): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("parent");
    const { type, enabled } = preferenceSchema.parse(payload);
    await setPreference(db, user.id, type, enabled);
    refresh();
    return ok(undefined, enabled ? "Bildirim açıldı." : "Bildirim kapatıldı.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function savePushSubscriptionAction(payload: unknown): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requireRole("parent");
    const input = pushSubscriptionSchema.parse(payload);
    const { userAgent } = await getRequestMeta();
    await saveSubscription(db, user.id, input, userAgent?.slice(0, 300) ?? null);
    return ok(undefined, "Bu cihazda bildirimler açıldı.");
  } catch (error) {
    return toActionError(error);
  }
}

/** Whether this browser's subscription is stored for the session user. */
export async function checkPushSubscriptionAction(endpoint: unknown): Promise<ActionResult<boolean>> {
  try {
    const { user } = await requireRole("parent");
    return ok(await hasSubscription(db, user.id, endpointSchema.parse(endpoint)));
  } catch (error) {
    return toActionError(error);
  }
}
