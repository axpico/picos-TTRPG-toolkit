import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDefinition } from "@toolkit/shared";
import { advance, advanceToMinutes, clampDay } from "../../src/lib/calendar.js";

// A small, easy-to-reason-about calendar: 3 months of 10/5/20 days, 4h days, 60m hours.
const DEF: CalendarDefinition = {
  monthNames: ["Alpha", "Beta", "Gamma"],
  daysPerMonth: [10, 5, 20],
  weekdayNames: ["A", "B"],
  hoursPerDay: 4,
  minutesPerHour: 60,
};

const at = (y: number, mo: number, d: number, h: number, mi: number) => ({ y, mo, d, h, mi });

test("minutes roll into hours", () => {
  assert.deepEqual(advance(DEF, at(1, 1, 1, 0, 0), 90), at(1, 1, 1, 1, 30));
});

test("hours roll into days (4h day)", () => {
  assert.deepEqual(advance(DEF, at(1, 1, 1, 3, 0), 120), at(1, 1, 2, 1, 0));
});

test("days roll into the next month using that month's length", () => {
  // Month 1 has 10 days; starting day 10 + 1 day → month 2 day 1.
  assert.deepEqual(advance(DEF, at(1, 1, 10, 0, 0), 4 * 60), at(1, 2, 1, 0, 0));
});

test("year wraps after the last month", () => {
  // Month 3 has 20 days; day 20 + 1 day → year 2, month 1, day 1.
  assert.deepEqual(advance(DEF, at(5, 3, 20, 0, 0), 4 * 60), at(6, 1, 1, 0, 0));
});

test("advancing zero minutes is a no-op", () => {
  assert.deepEqual(advance(DEF, at(2, 2, 3, 1, 15), 0), at(2, 2, 3, 1, 15));
});

test("negative minutes are clamped to zero", () => {
  assert.deepEqual(advance(DEF, at(2, 2, 3, 1, 15), -999), at(2, 2, 3, 1, 15));
});

test("clampDay caps to the month length and floors at 1", () => {
  assert.equal(clampDay(DEF, 2, 99), 5); // month 2 has 5 days
  assert.equal(clampDay(DEF, 2, 0), 1);
  assert.equal(clampDay(DEF, 3, 20), 20);
});

test("clampDay clamps an out-of-range month index", () => {
  // Month 9 clamps to month 3 (20 days).
  assert.equal(clampDay(DEF, 9, 100), 20);
  // Month 0 clamps to month 1 (10 days).
  assert.equal(clampDay(DEF, 0, 100), 10);
});

test("advanceToMinutes converts each unit using the definition", () => {
  // 1 day = 4h*60 = 240; 2h = 120; 30m = 30; rounds: 10*6s = 60s = 1m.
  assert.equal(
    advanceToMinutes(DEF, { days: 1, hours: 2, minutes: 30, rounds: 10 }),
    240 + 120 + 30 + 1,
  );
});

test("advanceToMinutes honors a custom secondsPerRound", () => {
  // 5 rounds * 12s = 60s = 1 minute.
  assert.equal(advanceToMinutes(DEF, { rounds: 5, secondsPerRound: 12 }), 1);
});

test("advanceToMinutes defaults to zero with no input", () => {
  assert.equal(advanceToMinutes(DEF, {}), 0);
});
