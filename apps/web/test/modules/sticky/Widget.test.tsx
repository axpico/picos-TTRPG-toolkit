import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

// Sticky's content lives in widget state; sharing reads the broadcast api, mocked
// here so the widget mounts without a QueryClient.
vi.mock("../../../src/modules/broadcast/api.js", () => ({
  useBroadcasts: () => ({ data: [] }),
  useSetBroadcast: () => ({ mutate: vi.fn(), isPending: false }),
  useSetBroadcasts: () => ({ mutate: vi.fn(), isPending: false }),
  usePresence: () => ({ data: { count: 0 } }),
}));

await import("../../../src/modules/sticky/Widget.js");
const StickyWidget = getWidget("sticky")!.Component;

afterEach(cleanup);

describe("StickyWidget", () => {
  it("renders the current note text from state", () => {
    const ctx = {
      campaignId: "camp",
      instanceId: "i1",
      state: { text: "remember the dragon" },
      setState: () => {},
    };
    render(<StickyWidget {...ctx} />);
    expect(screen.getByDisplayValue("remember the dragon")).toBeTruthy();
  });

  it("writes edits back through setState", async () => {
    const user = userEvent.setup();
    const setState = vi.fn();
    const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState };
    render(<StickyWidget {...ctx} />);
    await user.type(screen.getByPlaceholderText("Note…"), "x");
    expect(setState).toHaveBeenCalledWith({ text: "x" });
  });
});
