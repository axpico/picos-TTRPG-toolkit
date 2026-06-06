import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

const h = vi.hoisted(() => ({ addMutate: vi.fn() }));

vi.mock("../../../src/modules/log/api.js", () => ({
  useLog: () => ({ data: [] }),
  useAddLogNote: () => ({ mutate: h.addMutate, isPending: false }),
}));

vi.mock("../../../src/components/Toast.js", () => ({ useToast: () => () => {} }));

await import("../../../src/modules/log/Widget.js");
const LogWidget = getWidget("log")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

beforeEach(() => h.addMutate.mockReset());
afterEach(cleanup);

describe("SessionLogWidget", () => {
  it("renders the empty state when the log is empty", () => {
    render(<LogWidget {...ctx} />);
    expect(screen.getByText(/Empty log/i)).toBeTruthy();
  });

  it("keeps Add disabled until a note is typed", () => {
    render(<LogWidget {...ctx} />);
    const add = screen.getByRole("button", { name: "Add" });
    expect((add as HTMLButtonElement).disabled).toBe(true);
  });

  it("submits a manual note as a note-kind log entry", () => {
    render(<LogWidget {...ctx} />);
    const input = screen.getByPlaceholderText("Add a note to the log…");
    fireEvent.change(input, { target: { value: "Goblins ambush the party" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(h.addMutate).toHaveBeenCalled();
    expect(h.addMutate.mock.calls[0]![0]).toEqual({
      kind: "note",
      message: "Goblins ambush the party",
    });
  });
});
