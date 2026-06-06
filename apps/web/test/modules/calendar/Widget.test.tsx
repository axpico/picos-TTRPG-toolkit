import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

const h = vi.hoisted(() => ({
  advanceMutate: vi.fn(),
  rollWeatherMutate: vi.fn(),
  setMutate: vi.fn(),
  calendar: { data: null as unknown },
}));

vi.mock("../../../src/modules/calendar/api.js", () => ({
  useCalendar: () => h.calendar,
  useSetCalendar: () => ({ mutate: h.setMutate, isPending: false }),
  useAdvanceCalendar: () => ({ mutate: h.advanceMutate, isPending: false }),
}));

vi.mock("../../../src/modules/weather/api.js", () => ({
  useRollWeather: () => ({ mutate: h.rollWeatherMutate, isPending: false }),
}));

await import("../../../src/modules/calendar/Widget.js");
const CalendarWidget = getWidget("calendar")!.Component;

const CAL = {
  id: "cal1",
  campaignId: "camp",
  definition: {
    monthNames: ["Firstmonth", "Secondmonth"],
    daysPerMonth: [30, 30],
    weekdayNames: ["D1", "D2", "D3", "D4", "D5", "D6", "D7"],
    hoursPerDay: 24,
    minutesPerHour: 60,
  },
  currentYear: 1,
  currentMonth: 1,
  currentDay: 1,
  currentHour: 0,
  currentMinute: 0,
};

const ctx = (over: Partial<Record<string, unknown>> = {}) => ({
  campaignId: "camp",
  instanceId: "i1",
  state: undefined,
  setState: vi.fn(),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.calendar.data = CAL;
});
afterEach(cleanup);

describe("CalendarWidget", () => {
  it("is registered", () => {
    expect(getWidget("calendar")).toBeTruthy();
  });

  it("mounts before calendar data has loaded without crashing", () => {
    h.calendar.data = null;
    expect(() => render(<CalendarWidget {...ctx()} />)).not.toThrow();
  });

  it("rolls fresh weather when a new day starts and the option is on", () => {
    // The advance endpoint reports the new day; the widget compares it to the old.
    h.advanceMutate.mockImplementation((_input, opts) =>
      opts.onSuccess({ ...CAL, currentDay: 2 }),
    );
    render(<CalendarWidget {...ctx({ state: { rollWeatherOnNewDay: true } })} />);
    fireEvent.click(screen.getByRole("button", { name: "+1 day" }));
    expect(h.rollWeatherMutate).toHaveBeenCalledTimes(1);
  });

  it("does not roll weather when the option is off", () => {
    h.advanceMutate.mockImplementation((_input, opts) =>
      opts.onSuccess({ ...CAL, currentDay: 2 }),
    );
    render(<CalendarWidget {...ctx({ state: { rollWeatherOnNewDay: false } })} />);
    fireEvent.click(screen.getByRole("button", { name: "+1 day" }));
    expect(h.rollWeatherMutate).not.toHaveBeenCalled();
  });

  it("does not roll weather when the day does not change", () => {
    // Advancing a few minutes keeps the same calendar day.
    h.advanceMutate.mockImplementation((_input, opts) => opts.onSuccess({ ...CAL }));
    render(<CalendarWidget {...ctx({ state: { rollWeatherOnNewDay: true } })} />);
    fireEvent.click(screen.getByRole("button", { name: "+10 min" }));
    expect(h.rollWeatherMutate).not.toHaveBeenCalled();
  });
});
