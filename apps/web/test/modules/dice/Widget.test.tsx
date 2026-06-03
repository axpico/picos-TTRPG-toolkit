import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

// Mutable role shared with the mocked auth module.
const h = vi.hoisted(() => ({ role: "dm" as string | undefined }));

vi.mock("../../../src/modules/dice/api.js", () => ({
  useDiceHistory: () => ({ data: [] }),
  useRollDice: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../../../src/auth/useAuth.js", () => ({
  useMe: () => ({
    data: { memberships: h.role ? [{ campaignId: "camp", role: h.role }] : [] },
  }),
  roleIn: (memberships: { campaignId: string; role: string }[] | undefined, cid: string) =>
    memberships?.find((m) => m.campaignId === cid)?.role,
}));

// Importing the module registers the widget under type "dice".
await import("../../../src/modules/dice/Widget.js");
const DiceWidget = getWidget("dice")!.Component;

const ctx = {
  campaignId: "camp",
  instanceId: "i1",
  state: undefined,
  setState: () => {},
};

afterEach(cleanup);

describe("DiceWidget hidden-roll toggle", () => {
  beforeEach(() => {
    h.role = "dm";
  });

  it("shows the Hidden roll toggle to the DM", () => {
    h.role = "dm";
    render(<DiceWidget {...ctx} />);
    expect(screen.getByText(/Hidden roll/i)).toBeTruthy();
  });

  it("hides the Hidden roll toggle from players", () => {
    h.role = "player";
    render(<DiceWidget {...ctx} />);
    expect(screen.queryByText(/Hidden roll/i)).toBeNull();
  });
});
