import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { registerWidget } from "../../src/canvas/WidgetRegistry.js";
import { WidgetPalette } from "../../src/canvas/WidgetPalette.js";

const Noop = () => null;
registerWidget({ type: "dice", title: "Dice Roller", defaultSize: { w: 1, h: 1 }, Component: Noop });
registerWidget({ type: "combat", title: "Combat Tracker", defaultSize: { w: 1, h: 1 }, Component: Noop });

afterEach(cleanup);

describe("WidgetPalette", () => {
  it("filters by query and adds the highlighted widget on Enter", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<WidgetPalette open onClose={() => {}} onAdd={onAdd} />);

    const input = screen.getByPlaceholderText("Search widgets…");
    await user.type(input, "dice");
    expect(screen.getByText("Dice Roller")).toBeTruthy();
    expect(screen.queryByText("Combat Tracker")).toBeNull();

    await user.keyboard("{Enter}");
    expect(onAdd).toHaveBeenCalledWith("dice");
  });
});
