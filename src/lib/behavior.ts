// Shared by client and server.

/** How long the teacher can undo a score (product decision: 10 seconds). */
export const UNDO_WINDOW_MS = 10_000;

export const MIN_POINTS = -10;
export const MAX_POINTS = 10;

export const formatPoints = (points: number) => (points > 0 ? `+${points}` : `−${Math.abs(points)}`);
