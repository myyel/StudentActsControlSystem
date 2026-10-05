// Shared by client and server.

/** Fixed number of evolution levels (product decision, phase 5). */
export const MAX_LEVEL = 5;

/** A teacher can give a class fewer levels (PRD §4.6); every type has MAX_LEVEL stages. */
export const MIN_CLASS_LEVELS = 2;

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

/**
 * A sentence instead of a number for children ("Fidan olmaya çok az kaldı!"). Next stage name is
 * null on the last level.
 */
export function nextStageSentence(progress: number, nextStageName: string | null) {
  if (nextStageName === null) return "En yüksek seviyede!";
  if (progress >= 0.66) return `${nextStageName} olmaya çok az kaldı!`;
  if (progress >= 0.33) return `${nextStageName} olma yolunda!`;
  return `Sırada: ${nextStageName}`;
}

// "Deniz'in ejderhası büyüdü!": the built-in type (slug in the asset url) with its possessive suffix.
const TYPE_NOUNS: Record<string, string> = { ejderha: "ejderhası", baykus: "baykuşu", robot: "robotu", tohum: "tohumu" };

export function characterNoun(assetUrl: string) {
  const slug = /\/characters\/([^/]+)\//.exec(assetUrl)?.[1] ?? "";
  return TYPE_NOUNS[slug] ?? "karakteri";
}
