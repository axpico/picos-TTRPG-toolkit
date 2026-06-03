import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/calendar/api.js", () => ({
  useCalendar: () => ({ data: null }),
  useSetCalendar: () => ({ mutate: vi.fn(), isPending: false }),
  useAdvanceCalendar: () => ({ mutate: vi.fn(), isPending: false }),
}));

await import("../../../src/modules/calendar/Widget.js");
const CalendarWidget = getWidget("calendar")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("CalendarWidget", () => {
  it("is registered", () => {
    expect(getWidget("calendar")).toBeTruthy();
  });

  it("mounts before calendar data has loaded without crashing", () => {
    expect(() => render(<CalendarWidget {...ctx} />)).not.toThrow();
  });
});
