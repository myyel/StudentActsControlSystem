// Shared by client and server.

/** How long the teacher can undo a score (product decision: 10 seconds). */
export const UNDO_WINDOW_MS = 10_000;

export const MIN_POINTS = -10;
export const MAX_POINTS = 10;

export const formatPoints = (points: number) => (points > 0 ? `+${points}` : `−${Math.abs(points)}`);

/** Pastel colour of a behavior tile; the same behavior looks the same on every screen. */
export type BehaviorTone = "sun" | "peach" | "rose" | "sky" | "lav" | "grass";

const TONES: readonly BehaviorTone[] = ["sun", "peach", "rose", "sky", "lav", "grass"];
const ICON_TONES: Record<string, BehaviorTone> = {
  "🤝": "peach", "✋": "rose", "📚": "sky", "💛": "sun", "⏳": "lav", "🧹": "grass", "⭐": "sun",
  "🛏️": "sky", "📖": "lav", "🍽️": "peach", "🪥": "grass",
};

export function behaviorTone(icon: string): BehaviorTone {
  const known = ICON_TONES[icon];
  if (known) return known;
  let hash = 0;
  for (const ch of icon) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return TONES[hash % TONES.length]!;
}
