import { describe, it, expect, beforeEach } from "vitest";
import type { LayoutItem } from "@toolkit/shared";
import { useCanvasStore } from "../../src/canvas/store.js";

const item = (over: Partial<LayoutItem> = {}): LayoutItem => ({
  instanceId: "w1",
  moduleType: "dice",
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  ...over,
});

describe("canvas store", () => {
  beforeEach(() => useCanvasStore.getState().reset());

  it("starts un-hydrated with the default layout", () => {
    const s = useCanvasStore.getState();
    expect(s.hydrated).toBe(false);
    expect(s.layout.items).toEqual([]);
  });

  it("setLayout marks the store hydrated", () => {
    useCanvasStore.getState().setLayout({ items: [item()], viewport: { x: 0, y: 0, scale: 1 } });
    const s = useCanvasStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.layout.items).toHaveLength(1);
  });

  it("upsertItem adds, then replaces by instanceId", () => {
    const store = useCanvasStore.getState();
    store.upsertItem(item({ instanceId: "a", x: 1 }));
    store.upsertItem(item({ instanceId: "a", x: 2 }));
    const items = useCanvasStore.getState().layout.items;
    expect(items).toHaveLength(1);
    expect(items[0]!.x).toBe(2);
  });

  it("patchItem merges a partial patch into the matching item", () => {
    const store = useCanvasStore.getState();
    store.upsertItem(item({ instanceId: "a", x: 1, y: 1 }));
    store.patchItem("a", { x: 99 });
    const found = useCanvasStore.getState().layout.items.find((i) => i.instanceId === "a");
    expect(found).toMatchObject({ x: 99, y: 1 });
  });

  it("removeItem filters the item out", () => {
    const store = useCanvasStore.getState();
    store.upsertItem(item({ instanceId: "a" }));
    store.upsertItem(item({ instanceId: "b" }));
    store.removeItem("a");
    const ids = useCanvasStore.getState().layout.items.map((i) => i.instanceId);
    expect(ids).toEqual(["b"]);
  });

  it("setViewport updates only the viewport", () => {
    useCanvasStore.getState().setViewport({ x: 5, y: 6, scale: 2 });
    expect(useCanvasStore.getState().layout.viewport).toEqual({ x: 5, y: 6, scale: 2 });
  });

  it("reset restores the default un-hydrated state", () => {
    const store = useCanvasStore.getState();
    store.setLayout({ items: [item()], viewport: { x: 1, y: 1, scale: 3 } });
    store.reset();
    const s = useCanvasStore.getState();
    expect(s.hydrated).toBe(false);
    expect(s.layout.items).toEqual([]);
  });
});
