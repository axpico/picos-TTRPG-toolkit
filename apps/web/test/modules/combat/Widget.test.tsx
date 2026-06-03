import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/combat/api.js", () => ({
  useEncounters: () => ({ data: [] }),
  useCreateEncounter: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateEncounter: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteEncounter: () => ({ mutate: vi.fn(), isPending: false }),
  useNextTurn: () => ({ mutate: vi.fn(), isPending: false }),
  usePrevTurn: () => ({ mutate: vi.fn(), isPending: false }),
  useRollInitiative: () => ({ mutate: vi.fn(), isPending: false }),
  useAddCombatant: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCombatant: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveCombatant: () => ({ mutate: vi.fn(), isPending: false }),
}));

await import("../../../src/modules/combat/Widget.js");
const CombatWidget = getWidget("combat")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("CombatWidget", () => {
  it("is registered", () => {
    expect(getWidget("combat")).toBeTruthy();
  });

  it("mounts with no encounters without crashing", () => {
    expect(() => render(<CombatWidget {...ctx} />)).not.toThrow();
  });
});
