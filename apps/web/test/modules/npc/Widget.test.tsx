import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/npc/api.js", () => ({
  useNpcs: () => ({ data: [] }),
  useCreateNpc: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateNpc: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteNpc: () => ({ mutate: vi.fn(), isPending: false }),
  useGenerateNpc: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../../../src/modules/broadcast/api.js", () => ({
  useBroadcasts: () => ({ data: [] }),
  useSetBroadcast: () => ({ mutate: vi.fn(), isPending: false }),
  useSetBroadcasts: () => ({ mutate: vi.fn(), isPending: false }),
  usePresence: () => ({ data: { count: 0 } }),
}));

await import("../../../src/modules/npc/Widget.js");
const NpcWidget = getWidget("npc")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("NpcWidget", () => {
  it("is registered", () => {
    expect(getWidget("npc")).toBeTruthy();
  });

  it("mounts with no NPCs without crashing", () => {
    expect(() => render(<NpcWidget {...ctx} />)).not.toThrow();
  });
});
