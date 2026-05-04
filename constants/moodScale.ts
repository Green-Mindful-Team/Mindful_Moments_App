/**
 * Mood values: 1 = sad, 2 = neutral, 3 = very happy.
 * Legacy entries may still store 4 or 5; treat those as 3 for display and editing.
 */
export type MoodThree = 1 | 2 | 3;

export function coerceStoredMoodToThree(m: number): MoodThree {
  if (m >= 4) return 3;
  if (m <= 1) return 1;
  const rounded = Math.round(m);
  return Math.min(3, Math.max(1, rounded)) as MoodThree;
}

/**
 * For charts and averages when a day may aggregate multiple entries (e.g. 2.5).
 * Clamps to [1, 3] but preserves decimals; legacy 4+ maps to 3.
 */
export function moodScalarClamped(m: number): number {
  if (Number.isNaN(m)) return 2;
  if (m >= 4) return 3;
  if (m <= 1) return 1;
  return Math.min(3, Math.max(1, m));
}

export function getMoodColor(m: number | undefined): string {
  if (m === undefined) return '#9ca3af';
  const t = coerceStoredMoodToThree(m);
  if (t === 3) return '#10b981';
  if (t === 2) return '#f59e0b';
  return '#ef4444';
}

export function getMoodLabel(m: number | undefined): string {
  if (m === undefined) return '';
  const t = coerceStoredMoodToThree(m);
  if (t === 3) return 'Very happy';
  if (t === 2) return 'Neutral';
  return 'Sad';
}
