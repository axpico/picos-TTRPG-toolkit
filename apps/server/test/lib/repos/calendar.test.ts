import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CALENDAR_DEFINITION } from "@toolkit/shared";
import type { Calendar as DbCalendar } from "@prisma/client";
import { toCalendarDto } from "../../../src/lib/repos/calendar.js";

const def = {
  monthNames: ["A", "B"],
  daysPerMonth: [10, 20],
  weekdayNames: ["X", "Y"],
  hoursPerDay: 24,
  minutesPerHour: 60,
};

const cal = (over: Partial<DbCalendar> = {}): DbCalendar => ({
  id: "cal",
  campaignId: "camp",
  definitionJson: JSON.stringify(def),
  currentYear: 1,
  currentMonth: 1,
  currentDay: 1,
  currentHour: 8,
  currentMinute: 0,
  ...over,
});

test("parses a custom definition and current fields", () => {
  const dto = toCalendarDto(cal({ currentDay: 5, currentHour: 12 }));
  assert.deepEqual(dto.definition.monthNames, ["A", "B"]);
  assert.equal(dto.currentDay, 5);
  assert.equal(dto.currentHour, 12);
});

test("falls back to the default definition on malformed JSON", () => {
  const dto = toCalendarDto(cal({ definitionJson: "not json" }));
  assert.deepEqual(dto.definition, DEFAULT_CALENDAR_DEFINITION);
});
