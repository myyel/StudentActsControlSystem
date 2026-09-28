import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { pushSubscription } from "@/server/db/schema";
import { createNotifications } from "@/server/services/notification";
import {
  MAX_PUSH_FAILURES,
  hasSubscription,
  removeSubscription,
  saveSubscription,
  sendPushNotifications,
  type PushSender,
} from "@/server/services/push";
import { isPushServiceUrl, pushSubscriptionSchema } from "@/server/validation/notification";
import { seedAuthFixture } from "../helpers/fixtures";

vi.mock("@/server/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: await createTestDb() };
});

let fx: Awaited<ReturnType<typeof seedAuthFixture>>;

beforeAll(async () => {
  fx = await seedAuthFixture(db);
});

const sub = (n: number) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/device-${n}`,
  keys: { p256dh: `key${n}`, auth: `auth${n}` },
});

const notify = (userId: string) =>
  createNotifications(db, [
    { userId, type: "message", url: "/veli/mesajlar/x", payload: { title: "Başlık", body: "Gövde" } },
  ]);

describe("push subscriptions", () => {
  it("accepts only real push services", () => {
    expect(isPushServiceUrl("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushServiceUrl("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isPushServiceUrl("https://web.push.apple.com/abc")).toBe(true);
    expect(isPushServiceUrl("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe(true);
    expect(isPushServiceUrl("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isPushServiceUrl("https://localhost/abc")).toBe(false);
    expect(isPushServiceUrl("https://evilgoogleapis.com/abc")).toBe(false);
    expect(isPushServiceUrl("https://169.254.169.254/latest")).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...sub(1), keys: { p256dh: "a b", auth: "x" } }).success).toBe(false);
  });

  it("moves an endpoint to the user who signs in on that browser", async () => {
    await saveSubscription(db, fx.users.parentA.id, sub(1), "UA");
    await saveSubscription(db, fx.users.parentA.id, sub(1), "UA");
    expect(await hasSubscription(db, fx.users.parentA.id, sub(1).endpoint)).toBe(true);

    await saveSubscription(db, fx.users.parentB.id, sub(1), "UA");
    expect(await hasSubscription(db, fx.users.parentA.id, sub(1).endpoint)).toBe(false);
    expect(await hasSubscription(db, fx.users.parentB.id, sub(1).endpoint)).toBe(true);
  });

  it("lets only the owner remove a subscription", async () => {
    await removeSubscription(db, fx.users.parentA.id, sub(1).endpoint);
    expect(await hasSubscription(db, fx.users.parentB.id, sub(1).endpoint)).toBe(true);
    await removeSubscription(db, fx.users.parentB.id, sub(1).endpoint);
    expect(await hasSubscription(db, fx.users.parentB.id, sub(1).endpoint)).toBe(false);
  });
});

describe("push delivery", () => {
  it("sends to every browser of the notified user only", async () => {
    await saveSubscription(db, fx.users.parentA.id, sub(10), null);
    await saveSubscription(db, fx.users.parentA.id, sub(11), null);
    await saveSubscription(db, fx.users.parentB.id, sub(12), null);
    const ids = await notify(fx.users.parentA.id);

    const send = vi.fn<PushSender>().mockResolvedValue(undefined);
    expect(await sendPushNotifications(db, ids, send)).toEqual({ sent: 2, failed: 0 });
    expect(send.mock.calls.map(([t]) => t.endpoint).sort()).toEqual([sub(10).endpoint, sub(11).endpoint]);
    const payload = JSON.parse(send.mock.calls[0]![1]);
    expect(payload).toEqual({ title: "Başlık", body: "Gövde", url: `/bildirim/${ids[0]}`, tag: ids[0] });

    const [row] = await db.select().from(pushSubscription).where(eq(pushSubscription.endpoint, sub(10).endpoint));
    expect(row!.lastSuccessAt).toBeInstanceOf(Date);
  });

  it("skips notifications that no longer exist", async () => {
    const send = vi.fn<PushSender>().mockResolvedValue(undefined);
    expect(await sendPushNotifications(db, ["00000000-0000-4000-8000-000000000000"], send)).toEqual({ sent: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("drops gone subscriptions and ones that keep failing", async () => {
    const gone = Object.assign(new Error("gone"), { statusCode: 410 });
    const flaky = Object.assign(new Error("server"), { statusCode: 500 });
    const send = vi.fn<PushSender>(async (target) => {
      throw target.endpoint === sub(10).endpoint ? gone : flaky;
    });

    await sendPushNotifications(db, await notify(fx.users.parentA.id), send);
    expect(await hasSubscription(db, fx.users.parentA.id, sub(10).endpoint)).toBe(false);
    expect(await hasSubscription(db, fx.users.parentA.id, sub(11).endpoint)).toBe(true);

    for (let i = 1; i < MAX_PUSH_FAILURES; i++) {
      await sendPushNotifications(db, await notify(fx.users.parentA.id), send);
    }
    expect(await hasSubscription(db, fx.users.parentA.id, sub(11).endpoint)).toBe(false);
    // Parent B's browser is untouched.
    expect(await hasSubscription(db, fx.users.parentB.id, sub(12).endpoint)).toBe(true);
  });
});
