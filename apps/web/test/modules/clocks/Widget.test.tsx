import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/clocks/api.js", () => ({
  useClocks: () => ({ data: [] }),
  useCreateClock: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateClock: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteClock: () => ({ mutate: vi.fn(), isPending: false }),
}));

await import("../../../src/modules/clocks/Widget.js");
const ClocksWidget = getWidget("clocks")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("ClocksWidget", () => {
  it("is registered as a broadcastable widget", () => {
    expect(getWidget("clocks")!.broadcastKey).toBe("clocks");
  });

  it("renders the empty state when there are no clocks", () => {
    render(<ClocksWidget {...ctx} />);
    expect(screen.getByText(/No clocks yet/i)).toBeTruthy();
  });
});
