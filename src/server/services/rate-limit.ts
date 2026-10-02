import { sql } from "drizzle-orm";
import type { DbOrTx } from "@/server/db";
import { UserError } from "@/server/action-result";
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

/** Data exports are expensive and rarely needed more often. */
export const EXPORT_RATE_LIMIT: RateLimitRule = { windowSeconds: 3600, max: 5 };
/** Admins export on behalf of families, so more often. */
export const ADMIN_EXPORT_RATE_LIMIT: RateLimitRule = { windowSeconds: 3600, max: 60 };
/** Password re-entry before deleting an account (guessing protection). */
export const PASSWORD_CONFIRM_RATE_LIMIT: RateLimitRule = { windowSeconds: 900, max: 5 };
/** Abuse ceilings, far above normal use. */
export const MESSAGE_RATE_LIMIT: RateLimitRule = { windowSeconds: 600, max: 30 };
export const HOME_BEHAVIOR_RATE_LIMIT: RateLimitRule = { windowSeconds: 600, max: 60 };
export const DELETION_REQUEST_RATE_LIMIT: RateLimitRule = { windowSeconds: 3600, max: 10 };

export const RATE_LIMITED = "Biraz mola verelim — biraz sonra tekrar deneyin.";

/** For actions: throws a user-facing error when the key is over its limit. */
export async function enforceRateLimit(db: DbOrTx, key: string, rule: RateLimitRule) {
  if (!(await consumeRateLimit(db, key, rule))) throw new UserError(RATE_LIMITED);
}
