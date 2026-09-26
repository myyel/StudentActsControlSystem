import { sql } from "drizzle-orm";
import type { DbOrTx } from "@/server/db";
import { rateLimit } from "@/server/db/schema";

export type RateLimitRule = { windowSeconds: number; max: number };

export const INVITE_RATE_LIMIT: RateLimitRule = { windowSeconds: 60, max: 10 };

/**
 * Fixed-window counter in the shared rate_limit table (keys are namespaced, e.g. "invite:<ip>").
 * Atomic via upsert, so concurrent requests cannot all slip through. Returns false when over the limit.
 */
export async function consumeRateLimit(db: DbOrTx, key: string, rule: RateLimitRule, now = Date.now()) {
  const windowStart = now - rule.windowSeconds * 1000;
  const expired = sql`${rateLimit.lastRequest} <= ${windowStart}`;

  const [row] = await db
    .insert(rateLimit)
    .values({ key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimit.count} + 1 end`,
        // lastRequest holds the start of the current window.
        lastRequest: sql`case when ${expired} then ${now} else ${rateLimit.lastRequest} end`,
      },
    })
    .returning({ count: rateLimit.count });

  return (row?.count ?? 1) <= rule.max;
}
