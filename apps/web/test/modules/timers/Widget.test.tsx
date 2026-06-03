import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/timers/api.js", () => ({
  useTimers: () => ({ data: [] }),
  useCreateTimer: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateTimer: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTimer: () => ({ mutate: vi.fn(), isPending: false }),
}));

await import("../../../src/modules/timers/Widget.js");
const TimersWidget = getWidget("timers")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("TimersWidget", () => {
  it("is registered as a broadcastable widget", () => {
    const def = getWidget("timers")!;
    expect(def.title).toBe("Timers");
    expect(def.broadcastKey).toBe("timers");
  });

  it("renders the empty state when there are no timers", () => {
    render(<TimersWidget {...ctx} />);
    expect(screen.getByText(/No timers yet/i)).toBeTruthy();
  });
});
