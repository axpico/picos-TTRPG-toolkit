import { describe, expect, it } from "vitest";
import type { LayoutItem } from "@toolkit/shared";
import { fitTransform, itemsBounds } from "../../src/canvas/viewport.js";

function item(partial: Partial<LayoutItem>): LayoutItem {
  return {
    instanceId: partial.instanceId ?? "i",
    moduleType: partial.moduleType ?? "weather",
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    w: partial.w ?? 100,
    h: partial.h ?? 100,
    state: partial.state,
  };
}

describe("itemsBounds", () => {
  it("returns null for an empty list", () => {
    expect(itemsBounds([])).toBeNull();
  });

  it("returns the box of a single item", () => {
    expect(itemsBounds([item({ x: 10, y: 20, w: 100, h: 50 })])).toEqual({
      minX: 10,
      minY: 20,
      maxX: 110,
      maxY: 70,
      w: 100,
      h: 50,
    });
  });

  it("covers multiple items", () => {
    const b = itemsBounds([
      item({ x: 0, y: 0, w: 100, h: 100 }),
      item({ x: 300, y: 200, w: 50, h: 50 }),
    ]);
    expect(b).toEqual({ minX: 0, minY: 0, maxX: 350, maxY: 250, w: 350, h: 250 });
  });

  it("handles negative coordinates", () => {
    const b = itemsBounds([
      item({ x: -200, y: -100, w: 100, h: 100 }),
      item({ x: 50, y: 50, w: 50, h: 50 }),
    ]);
    expect(b).toEqual({ minX: -200, minY: -100, maxX: 100, maxY: 100, w: 300, h: 200 });
  });
});

describe("fitTransform", () => {
  const vw = 1000;
  const vh = 800;

  it("centers the bbox center at the viewport center", () => {
    const bounds = { minX: 0, minY: 0, maxX: 200, maxY: 200, w: 200, h: 200 };
    const t = fitTransform(bounds, vw, vh, { padding: 0, minScale: 0.1, maxScale: 10 });
    const cx = bounds.minX + bounds.w / 2;
    const cy = bounds.minY + bounds.h / 2;
    // The bbox center should map back to the viewport center.
    expect(t.x + t.scale * cx).toBeCloseTo(vw / 2);
    expect(t.y + t.scale * cy).toBeCloseTo(vh / 2);
  });

  it("clamps to maxScale for a tiny bbox", () => {
    const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10, w: 10, h: 10 };
    const t = fitTransform(bounds, vw, vh, { minScale: 0.25, maxScale: 3 });
    expect(t.scale).toBe(3);
  });

  it("clamps to minScale for a huge bbox", () => {
    const bounds = { minX: 0, minY: 0, maxX: 100000, maxY: 100000, w: 100000, h: 100000 };
    const t = fitTransform(bounds, vw, vh, { minScale: 0.25, maxScale: 3 });
    expect(t.scale).toBe(0.25);
  });

  it("respects padding (smaller scale than with no padding)", () => {
    const bounds = { minX: 0, minY: 0, maxX: 900, maxY: 700, w: 900, h: 700 };
    const padded = fitTransform(bounds, vw, vh, { padding: 80, minScale: 0.1, maxScale: 10 });
    const unpadded = fitTransform(bounds, vw, vh, { padding: 0, minScale: 0.1, maxScale: 10 });
    expect(padded.scale).toBeLessThan(unpadded.scale);
  });

  it("does not produce Infinity/NaN for a zero-size bbox", () => {
    const bounds = { minX: 50, minY: 50, maxX: 50, maxY: 50, w: 0, h: 0 };
    const t = fitTransform(bounds, vw, vh, { minScale: 0.25, maxScale: 3 });
    expect(Number.isFinite(t.x)).toBe(true);
    expect(Number.isFinite(t.y)).toBe(true);
    expect(t.scale).toBe(3);
  });
});
