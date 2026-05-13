export type WordStat = {
  level: number;
  lastSeen: number;
};

export type WordStats = Record<string, WordStat>;

const DAY_MS = 24 * 60 * 60 * 1000;

export const INTERVALS_MS = [1 * DAY_MS, 3 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS];

export const MAX_LEVEL = INTERVALS_MS.length - 1;
export const DAILY_CAP = 10;

export function isDue(stat: WordStat, now: number = Date.now()): boolean {
  const level = Math.min(stat.level, MAX_LEVEL);
  return now - stat.lastSeen >= INTERVALS_MS[level];
}

export function nextLevel(currentLevel: number, correct: boolean): number {
  if (correct) return Math.min(currentLevel + 1, MAX_LEVEL);
  return 0;
}

export function daysUntilDue(stat: WordStat, now: number = Date.now()): number {
  const level = Math.min(stat.level, MAX_LEVEL);
  const dueAt = stat.lastSeen + INTERVALS_MS[level];
  return Math.max(0, Math.ceil((dueAt - now) / DAY_MS));
}
