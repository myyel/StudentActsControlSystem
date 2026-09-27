// Shared by client and server.

/** Fixed number of evolution levels (product decision, phase 5). */
export const MAX_LEVEL = 5;

/** XP needed for levels 1…5 when a school has not configured its own thresholds. */
export const DEFAULT_LEVEL_THRESHOLDS = [0, 20, 50, 100, 200] as const;

export const PLACEHOLDER_ASSET_URL = "/characters/placeholder.svg";

/** thresholds[i] is the XP needed for level i + 1; thresholds[0] is always 0. */
export function levelForXp(thresholds: readonly number[], xp: number) {
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) if (xp >= thresholds[i]!) level = i + 1;
  return level;
}

/**
 * Progress from the student's level towards the next one, 0…1. The stored level can be
 * ahead of the XP (events deleted after a level up; levels never drop), which reads as 0.
 */
export function levelProgress(thresholds: readonly number[], level: number, xp: number) {
  if (level >= thresholds.length) return 1;
  const from = thresholds[level - 1]!;
  const to = thresholds[level]!;
  return Math.min(Math.max((xp - from) / (to - from), 0), 1);
}
