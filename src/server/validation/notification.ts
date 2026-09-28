import { z } from "@/lib/zod";
import { notificationType } from "@/server/db/schema";

// The server POSTs to the endpoint, so only real browser push services are accepted (no SSRF).
const PUSH_HOST_SUFFIXES = [".googleapis.com", ".mozilla.com", ".push.apple.com", ".notify.windows.com"];

export function isPushServiceUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && PUSH_HOST_SUFFIXES.some((s) => host.endsWith(s));
  } catch {
    return false;
  }
}

const base64Url = z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).max(200);

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(1000).refine(isPushServiceUrl, "Bu tarayıcının bildirim servisi desteklenmiyor."),
  keys: z.object({ p256dh: base64Url, auth: base64Url }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const endpointSchema = z.string().max(1000);

export const preferenceSchema = z.object({
  type: z.enum(notificationType.enumValues),
  enabled: z.boolean(),
});
