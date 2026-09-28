import { and, eq, inArray, sql } from "drizzle-orm";
import webpush from "web-push";
import type { Db } from "@/server/db";
import { notification, pushSubscription } from "@/server/db/schema";
import type { PushSubscriptionInput } from "@/server/validation/notification";

/** A subscription is dropped after this many failed sends in a row. */
export const MAX_PUSH_FAILURES = 5;

export type PushTarget = { endpoint: string; keys: { p256dh: string; auth: string } };
/** Rejects with an error carrying `statusCode` (as web-push does) when delivery fails. */
export type PushSender = (target: PushTarget, payload: string) => Promise<unknown>;

/** What the service worker receives (public/sw.js). */
export type PushMessage = { title: string; body: string; url: string; tag: string };

export type VapidConfig = { publicKey: string; privateKey: string; subject: string };

export function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

/** Real sender, or null when VAPID keys are not configured (push is then silently off). */
export function createWebPushSender(): PushSender | null {
  const vapid = getVapidConfig();
  if (!vapid) return null;
  return (target, payload) =>
    webpush.sendNotification(target, payload, {
      vapidDetails: vapid,
      // A notification older than a day is not worth waking the phone for.
      TTL: 86_400,
      urgency: "normal",
    });
}

/**
 * Stores this browser's subscription for the user. An endpoint belongs to one browser, so a
 * browser that signs in as another user moves to that user.
 */
export async function saveSubscription(db: Db, userId: string, input: PushSubscriptionInput, userAgent: string | null) {
  await db
    .insert(pushSubscription)
    .values({ userId, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { userId, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent, failureCount: 0 },
    });
}

/** Only the owner can remove a subscription (sign out, or turning push off on this device). */
export async function removeSubscription(db: Db, userId: string, endpoint: string) {
  await db.delete(pushSubscription).where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)));
}

export async function hasSubscription(db: Db, userId: string, endpoint: string) {
  const [row] = await db
    .select({ id: pushSubscription.id })
    .from(pushSubscription)
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)));
  return Boolean(row);
}

const statusOf = (error: unknown) =>
  error && typeof error === "object" && "statusCode" in error ? Number((error as { statusCode: unknown }).statusCode) : 0;

/**
 * Pushes the given notifications to every browser of their users. Notifications removed in the
 * meantime (an undone behavior) are skipped. Gone subscriptions (404/410) are deleted; others
 * are deleted after MAX_PUSH_FAILURES failures in a row.
 */
export async function sendPushNotifications(db: Db, notificationIds: string[], send: PushSender) {
  if (notificationIds.length === 0) return { sent: 0, failed: 0 };
  const rows = await db
    .select({
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      payload: notification.payload,
      subscriptionId: pushSubscription.id,
      endpoint: pushSubscription.endpoint,
      p256dh: pushSubscription.p256dh,
      auth: pushSubscription.auth,
    })
    .from(notification)
    .innerJoin(pushSubscription, eq(pushSubscription.userId, notification.userId))
    .where(inArray(notification.id, notificationIds));

  let sent = 0;
  let failed = 0;
  await Promise.all(
    rows.map(async (r) => {
      const message: PushMessage = {
        title: r.payload.title,
        body: r.payload.body,
        // Opens through the route that marks the notification read.
        url: `/bildirim/${r.id}`,
        tag: r.id,
      };
      try {
        await send({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, JSON.stringify(message));
        sent++;
        await db
          .update(pushSubscription)
          .set({ failureCount: 0, lastSuccessAt: new Date() })
          .where(eq(pushSubscription.id, r.subscriptionId));
      } catch (error) {
        failed++;
        const status = statusOf(error);
        if (status === 404 || status === 410) {
          await db.delete(pushSubscription).where(eq(pushSubscription.id, r.subscriptionId));
          return;
        }
        const [updated] = await db
          .update(pushSubscription)
          .set({ failureCount: sql`${pushSubscription.failureCount} + 1` })
          .where(eq(pushSubscription.id, r.subscriptionId))
          .returning({ failureCount: pushSubscription.failureCount });
        if (updated && updated.failureCount >= MAX_PUSH_FAILURES) {
          await db.delete(pushSubscription).where(eq(pushSubscription.id, r.subscriptionId));
        }
      }
    }),
  );
  return { sent, failed };
}
