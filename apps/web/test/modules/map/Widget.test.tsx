import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/map/api.js", () => ({
  useLocations: () => ({ data: [] }),
  useCreateLocation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateLocation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteLocation: () => ({ mutate: vi.fn(), isPending: false }),
  useUploadAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("../../../src/modules/broadcast/api.js", () => ({
  useBroadcasts: () => ({ data: [] }),
  useSetBroadcast: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("../../../src/modules/party/api.js", () => ({
  useParty: () => ({ data: [] }),
}));
vi.mock("../../../src/modules/bestiary/api.js", () => ({
  useMonsters: () => ({ data: [] }),
}));

beforeAll(() => {
  // react-zoom-pan-pinch observes its container; jsdom lacks ResizeObserver.
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

await import("../../../src/modules/map/Widget.js");
const MapWidget = getWidget("map")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("MapWidget", () => {
  it("is registered", () => {
    expect(getWidget("map")).toBeTruthy();
  });

  it("mounts with no locations without crashing", () => {
    expect(() => render(<MapWidget {...ctx} />)).not.toThrow();
  });
});
