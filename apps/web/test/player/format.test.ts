import { describe, it, expect } from "vitest";
import type { Calendar } from "@toolkit/shared";
import {
  addCondition,
  applyHpDelta,
  formatClock,
  formatGameDate,
  removeCondition,
} from "../../src/player/format.js";

describe("applyHpDelta", () => {
  it("heals and damages within bounds", () => {
    expect(applyHpDelta(5, 10, 3)).toBe(8);
    expect(applyHpDelta(5, 10, -2)).toBe(3);
  });
  it("clamps to 0 and hpMax", () => {
    expect(applyHpDelta(2, 10, -50)).toBe(0);
    expect(applyHpDelta(8, 10, 50)).toBe(10);
    expect(applyHpDelta(5, 0, 3)).toBe(0);
  });
});

describe("addCondition / removeCondition", () => {
  it("adds trimmed, ignores blanks, de-dupes case-insensitively", () => {
    expect(addCondition([], "  Poisoned ")).toEqual(["Poisoned"]);
    expect(addCondition(["Poisoned"], "")).toEqual(["Poisoned"]);
    expect(addCondition(["Poisoned"], "poisoned")).toEqual(["Poisoned"]);
    expect(addCondition(["Poisoned"], "Prone")).toEqual(["Poisoned", "Prone"]);
  });
  it("removes by case-insensitive match", () => {
    expect(removeCondition(["Poisoned", "Prone"], "prone")).toEqual(["Poisoned"]);
    expect(removeCondition(["Poisoned"], "stunned")).toEqual(["Poisoned"]);
  });
});

const cal: Calendar = {
  id: "c",
  campaignId: "camp",
  definition: {
    monthNames: ["Alpha", "Beta"],
    daysPerMonth: [30, 30],
    weekdayNames: ["A", "B"],
    hoursPerDay: 24,
    minutesPerHour: 60,
  },
  currentYear: 1247,
  currentMonth: 2,
  currentDay: 5,
  currentHour: 9,
  currentMinute: 7,
};

describe("formatClock / formatGameDate", () => {
  it("pads the clock", () => {
    expect(formatClock(cal)).toBe("09:07");
  });
  it("names the month, falling back when out of range", () => {
    expect(formatGameDate(cal)).toBe("5 Beta 1247");
    expect(formatGameDate({ ...cal, currentMonth: 9 })).toBe("5 Month 9 1247");
  });
});
