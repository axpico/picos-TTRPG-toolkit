import type { Calendar } from "@toolkit/shared";

/** Apply a signed HP delta, clamped to [0, hpMax]. */
export function applyHpDelta(hp: number, hpMax: number, delta: number): number {
  const max = Math.max(0, hpMax);
  return Math.max(0, Math.min(max, hp + delta));
}

/** Add a condition (trimmed, case-insensitive de-dupe); no-op on blank. */
export function addCondition(conditions: string[], raw: string): string[] {
  const value = raw.trim();
  if (!value) return conditions;
  const exists = conditions.some((c) => c.toLowerCase() === value.toLowerCase());
  return exists ? conditions : [...conditions, value];
}

/** Remove a condition by case-insensitive match. */
export function removeCondition(conditions: string[], target: string): string[] {
  return conditions.filter((c) => c.toLowerCase() !== target.trim().toLowerCase());
}

/** "HH:MM" from a calendar's current hour/minute. */
export function formatClock(cal: Pick<Calendar, "currentHour" | "currentMinute">): string {
  return `${String(cal.currentHour).padStart(2, "0")}:${String(cal.currentMinute).padStart(2, "0")}`;
}

/** "<day> <MonthName> <year>", falling back to "Month N" when unnamed. */
export function formatGameDate(cal: Calendar): string {
  const month = cal.definition.monthNames[cal.currentMonth - 1] ?? `Month ${cal.currentMonth}`;
  return `${cal.currentDay} ${month} ${cal.currentYear}`;
}
