export const GRADE_LEVELS = [1, 2, 3, 4] as const;

/** "2. sınıf" for one level, "1-2-3. sınıf (birleştirilmiş)" for a combined class. */
export function formatGradeLevels(levels: readonly number[]) {
  if (levels.length === 1) return `${levels[0]}. sınıf`;
  return `${levels.join("-")}. sınıf (birleştirilmiş)`;
}

export const isCombined = (levels: readonly number[]) => levels.length > 1;
