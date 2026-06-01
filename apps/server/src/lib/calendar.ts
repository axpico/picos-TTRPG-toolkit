import type { CalendarDefinition } from "@toolkit/shared";

export interface CalendarState {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
}

/** Clamp a day to a valid value for the given month (1..daysPerMonth[month]). */
export function clampDay(def: CalendarDefinition, month: number, day: number): number {
  const idx = Math.max(1, Math.min(def.monthNames.length, month)) - 1;
  const max = def.daysPerMonth[idx] ?? 30;
  return Math.max(1, Math.min(max, day));
}

/**
 * Advance a calendar state forward by `totalMinutes` (>= 0), rolling minutes →
 * hours → days → months → years using the calendar definition. Month lengths
 * are honored per-month via `daysPerMonth`.
 */
export function advance(
  def: CalendarDefinition,
  state: CalendarState,
  totalMinutes: number,
): CalendarState {
  let { y, mo, d, h, mi } = state;
  mi += Math.max(0, totalMinutes);
  while (mi >= def.minutesPerHour) {
    mi -= def.minutesPerHour;
    h += 1;
  }
  while (h >= def.hoursPerDay) {
    h -= def.hoursPerDay;
    d += 1;
  }
  let safety = 10_000;
  while (safety-- > 0) {
    const monthIdx = (((mo - 1) % def.monthNames.length) + def.monthNames.length) % def.monthNames.length;
    const dim = def.daysPerMonth[monthIdx] ?? 30;
    if (d <= dim) break;
    d -= dim;
    mo += 1;
    if (mo > def.monthNames.length) {
      mo = 1;
      y += 1;
    }
  }
  return { y, mo, d, h, mi };
}

/** Convert a free-form advance request into total minutes using the calendar's units. */
export function advanceToMinutes(
  def: CalendarDefinition,
  input: {
    rounds?: number;
    secondsPerRound?: number;
    minutes?: number;
    hours?: number;
    days?: number;
  },
): number {
  const spr = input.secondsPerRound ?? 6;
  return (
    Math.floor(((input.rounds ?? 0) * spr) / 60) +
    (input.minutes ?? 0) +
    (input.hours ?? 0) * def.minutesPerHour +
    (input.days ?? 0) * def.hoursPerDay * def.minutesPerHour
  );
}
