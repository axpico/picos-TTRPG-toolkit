import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/log/api.js", () => ({
  useLog: () => ({ data: [] }),
}));

await import("../../../src/modules/log/Widget.js");
const LogWidget = getWidget("log")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("SessionLogWidget", () => {
  it("renders the empty state when the log is empty", () => {
    render(<LogWidget {...ctx} />);
    expect(screen.getByText(/Empty log/i)).toBeTruthy();
  });
});
