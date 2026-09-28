import { after } from "next/server";
import { db } from "@/server/db";
import { createWebPushSender, sendPushNotifications } from "@/server/services/push";

/**
 * Pushes notifications after the response is sent. With `delayMs` the push waits (e.g. for
 * the undo window); notifications removed meanwhile are skipped. The delay lives in this
 * process, so a restart in that window loses the push; the in-app notification stays.
 * No-op when VAPID keys are not configured.
 */
export function dispatchPush(notificationIds: string[], opts: { delayMs?: number } = {}) {
  if (notificationIds.length === 0) return;
  const send = createWebPushSender();
  if (!send) return;
  after(async () => {
    if (opts.delayMs) await new Promise((resolve) => setTimeout(resolve, opts.delayMs));
    try {
      await sendPushNotifications(db, notificationIds, send);
    } catch (error) {
      console.error("Push delivery failed", error);
    }
  });
}
