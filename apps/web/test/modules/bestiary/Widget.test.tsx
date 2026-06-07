import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/bestiary/api.js", () => ({
  useMonsters: () => ({ data: [] }),
  useCreateMonster: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateMonster: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteMonster: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../../../src/modules/broadcast/api.js", () => ({
  useBroadcasts: () => ({ data: [] }),
  useSetBroadcast: () => ({ mutate: vi.fn(), isPending: false }),
  useSetBroadcasts: () => ({ mutate: vi.fn(), isPending: false }),
  usePresence: () => ({ data: { count: 0 } }),
}));

await import("../../../src/modules/bestiary/Widget.js");
const BestiaryWidget = getWidget("bestiary")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("BestiaryWidget", () => {
  it("is registered", () => {
    expect(getWidget("bestiary")).toBeTruthy();
  });

  it("mounts with no monsters without crashing", () => {
    expect(() => render(<BestiaryWidget {...ctx} />)).not.toThrow();
  });
});
