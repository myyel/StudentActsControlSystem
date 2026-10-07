import { describe, expect, it } from "vitest";
import {
  characterProgress,
  DEFAULT_LEVEL_THRESHOLDS,
  defaultCompleteXp,
  levelForXp,
  levelProgress,
  nextStageSentence,
} from "@/lib/character";
import { classLevelsSchema, levelThresholdsSchema } from "@/server/validation/character";

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

describe("finishing a character", () => {
  it("defaults the completion XP to one more step like the last one", () => {
    expect(defaultCompleteXp(T)).toBe(300);
    expect(defaultCompleteXp([0, 3, 6])).toBe(9);
  });

  it("fills the last level towards the next character", () => {
    expect(characterProgress(T, 300, 4, 150)).toBe(0.5);
    expect(characterProgress(T, 300, 5, 200)).toBe(0);
    expect(characterProgress(T, 300, 5, 250)).toBe(0.5);
    // Above a lowered level count: read as the last level.
    expect(characterProgress([0, 3, 6], 9, 5, 0)).toBe(0);
    // XP below the start of the character (events deleted after it began).
    expect(characterProgress(T, 300, 1, -5)).toBe(0);
  });

  it("talks about a new friend on the last level, never a number", () => {
    expect(nextStageSentence(0.1, "Fidan")).toBe("Sırada: Fidan");
    expect(nextStageSentence(0.9, "Fidan")).toBe("Fidan olmaya çok az kaldı!");
    for (const progress of [0, 0.5, 0.9]) {
      expect(nextStageSentence(progress, null)).toMatch(/arkadaş/);
      expect(nextStageSentence(progress, null)).not.toMatch(/\d/);
    }
  });

  it("accepts a completion XP only above the last level", () => {
    const parse = (completeXp: unknown) => levelThresholdsSchema.safeParse({ thresholds: [0, 10, 30, 60, 120], completeXp });
    expect(parse("200").data).toMatchObject({ completeXp: 200 });
    expect(parse("").data?.completeXp).toBeUndefined();
    expect(parse(null).data?.completeXp).toBeUndefined();
    expect(parse("120").success).toBe(false);
    expect(parse("50").success).toBe(false);
    expect(classLevelsSchema.safeParse({ thresholds: [0, 5], completeXp: "5" }).success).toBe(false);
    expect(classLevelsSchema.safeParse({ thresholds: [0, 5], completeXp: "6" }).success).toBe(true);
  });
});
