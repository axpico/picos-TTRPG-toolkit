import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

// Sticky has no API — text/color/title/fontSize live in widget state.
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
