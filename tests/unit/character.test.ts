import { describe, expect, it } from "vitest";
import { DEFAULT_LEVEL_THRESHOLDS, levelForXp, levelProgress } from "@/lib/character";
import { levelThresholdsSchema } from "@/server/validation/character";

const T = DEFAULT_LEVEL_THRESHOLDS; // 0, 20, 50, 100, 200

describe("levelForXp", () => {
  it("maps XP to the highest reached level", () => {
    expect(levelForXp(T, 0)).toBe(1);
    expect(levelForXp(T, 19)).toBe(1);
    expect(levelForXp(T, 20)).toBe(2);
    expect(levelForXp(T, 99)).toBe(3);
    expect(levelForXp(T, 200)).toBe(5);
    expect(levelForXp(T, 10_000)).toBe(5);
  });
});

describe("levelProgress", () => {
  it("is the share of the way to the next level", () => {
    expect(levelProgress(T, 1, 10)).toBe(0.5);
    expect(levelProgress(T, 2, 35)).toBe(0.5);
  });

  it("is full at the last level and empty when the level is ahead of the XP", () => {
    expect(levelProgress(T, 5, 150)).toBe(1);
    expect(levelProgress(T, 3, 10)).toBe(0);
  });
});

describe("levelThresholdsSchema", () => {
  const parse = (thresholds: unknown[]) => levelThresholdsSchema.safeParse({ thresholds });

  it("accepts increasing thresholds starting at 0, from form strings too", () => {
    expect(parse(["0", "10", "30", "60", "120"]).data).toEqual({ thresholds: [0, 10, 30, 60, 120] });
  });

  it("rejects a first level above 0, non-increasing values and the wrong count", () => {
    expect(parse([5, 10, 30, 60, 120]).success).toBe(false);
    expect(parse([0, 10, 10, 60, 120]).success).toBe(false);
    expect(parse([0, 10, 30, 60]).success).toBe(false);
    expect(parse([0, 10, -3, 60, 120]).success).toBe(false);
  });
});
