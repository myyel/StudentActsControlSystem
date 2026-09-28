import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db";
import { consumeRateLimit, enforceRateLimit, RATE_LIMITED } from "@/server/services/rate-limit";
import { createTestDb } from "../helpers/db";

let db: Db;
const rule = { windowSeconds: 60, max: 10 };

beforeAll(async () => {
  db = await createTestDb();
});

describe("consumeRateLimit", () => {
  it("allows 10 requests per window and blocks the 11th", async () => {
    const now = 1_000_000;
    const results: boolean[] = [];
    for (let i = 0; i < 11; i++) results.push(await consumeRateLimit(db, "invite:a", rule, now + i));
    expect(results.slice(0, 10).every(Boolean)).toBe(true);
    expect(results[10]).toBe(false);
  });

  it("opens again once the window has passed", async () => {
    expect(await consumeRateLimit(db, "invite:a", rule, 1_000_000 + 60_000)).toBe(true);
  });

  it("keeps keys independent", async () => {
    expect(await consumeRateLimit(db, "invite:b", rule, 1_000_000)).toBe(true);
  });

  it("counts concurrent requests atomically", async () => {
    const now = 5_000_000;
    const results = await Promise.all(
      Array.from({ length: 15 }, () => consumeRateLimit(db, "invite:c", rule, now)),
    );
    expect(results.filter(Boolean)).toHaveLength(10);
  });
});

describe("enforceRateLimit", () => {
  it("throws a user-facing error once the key is over its limit, per key", async () => {
    const small = { windowSeconds: 600, max: 2 };
    await enforceRateLimit(db, "export:u1", small);
    await enforceRateLimit(db, "export:u1", small);
    await expect(enforceRateLimit(db, "export:u1", small)).rejects.toThrow(RATE_LIMITED);
    // Another user is not affected.
    await expect(enforceRateLimit(db, "export:u2", small)).resolves.toBeUndefined();
  });
});
