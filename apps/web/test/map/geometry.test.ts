import { describe, it, expect } from "vitest";
import type { MapGrid, MapPin, MapReveal } from "@toolkit/shared";
import { isPointRevealed, snapToGrid, presetTokenSize } from "@toolkit/shared";
import {
  MIN_REVEAL,
  clamp01,
  toNormalized,
  drawReveal,
  moveReveal,
  resizeReveal,
  movePin,
  isDrag,
} from "../../src/modules/map/geometry.js";

const rect = { left: 100, top: 50, width: 400, height: 200 };

const reveal = (over: Partial<MapReveal> = {}): MapReveal => ({
  id: "r1",
  x: 0.2,
  y: 0.2,
  w: 0.4,
  h: 0.4,
  mode: "reveal",
  ...over,
});

const pin = (over: Partial<MapPin> = {}): MapPin => ({
  id: "p1",
  x: 0.5,
  y: 0.5,
  label: "",
  color: "#fff",
  playerVisible: true,
  ...over,
});

describe("clamp01", () => {
  it("clamps to the 0..1 range", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
  });
});

describe("toNormalized", () => {
  it("maps client coords to normalized image space relative to the rect", () => {
    expect(toNormalized(300, 150, rect)).toEqual({ x: 0.5, y: 0.5 });
    expect(toNormalized(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(toNormalized(500, 250, rect)).toEqual({ x: 1, y: 1 });
  });

  it("clamps points outside the rect", () => {
    expect(toNormalized(0, 0, rect)).toEqual({ x: 0, y: 0 });
    expect(toNormalized(9999, 9999, rect)).toEqual({ x: 1, y: 1 });
  });

  it("avoids division by zero for a degenerate rect", () => {
    expect(toNormalized(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe("drawReveal", () => {
  it("builds a rect dragging top-left to bottom-right", () => {
    expect(drawReveal({ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.6 })).toEqual({
      x: 0.1,
      y: 0.1,
      w: 0.4,
      h: 0.5,
    });
  });

  it("normalizes regardless of drag direction", () => {
    const tl = drawReveal({ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.6 });
    const br = drawReveal({ x: 0.5, y: 0.6 }, { x: 0.1, y: 0.1 });
    const tr = drawReveal({ x: 0.5, y: 0.1 }, { x: 0.1, y: 0.6 });
    const bl = drawReveal({ x: 0.1, y: 0.6 }, { x: 0.5, y: 0.1 });
    expect(br).toEqual(tl);
    expect(tr).toEqual(tl);
    expect(bl).toEqual(tl);
  });

  it("enforces a minimum size for a near-zero drag", () => {
    const r = drawReveal({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 });
    expect(r.w).toBe(MIN_REVEAL);
    expect(r.h).toBe(MIN_REVEAL);
  });

  it("keeps a min-size rect inside the bounds when drawn at the edge", () => {
    const r = drawReveal({ x: 1, y: 1 }, { x: 1, y: 1 });
    expect(r.x + r.w).toBeLessThanOrEqual(1.0000001);
    expect(r.y + r.h).toBeLessThanOrEqual(1.0000001);
  });
});

describe("moveReveal", () => {
  it("translates by a delta", () => {
    const r = moveReveal(reveal(), 0.1, -0.1);
    expect(r.x).toBeCloseTo(0.3);
    expect(r.y).toBeCloseTo(0.1);
  });

  it("clamps so the rect stays fully in bounds", () => {
    expect(moveReveal(reveal(), 1, 1)).toMatchObject({ x: 0.6, y: 0.6 });
    expect(moveReveal(reveal(), -1, -1)).toMatchObject({ x: 0, y: 0 });
  });
});

describe("resizeReveal", () => {
  it("moves the east edge without touching x", () => {
    const r = resizeReveal(reveal(), "e", 0.1, 0);
    expect(r.x).toBe(0.2);
    expect(r.w).toBeCloseTo(0.5);
  });

  it("moves the west edge and shifts x", () => {
    const r = resizeReveal(reveal(), "w", 0.1, 0);
    expect(r.x).toBeCloseTo(0.3);
    expect(r.w).toBeCloseTo(0.3);
  });

  it("resizes from a corner on both axes", () => {
    const r = resizeReveal(reveal(), "se", 0.1, 0.1);
    expect(r.w).toBeCloseTo(0.5);
    expect(r.h).toBeCloseTo(0.5);
  });

  it("clamps the moving edge to the bounds", () => {
    const r = resizeReveal(reveal(), "e", 1, 0);
    expect(r.x + r.w).toBeCloseTo(1);
  });

  it("never shrinks below the minimum size", () => {
    const r = resizeReveal(reveal(), "w", 1, 0);
    expect(r.w).toBeGreaterThanOrEqual(MIN_REVEAL);
  });
});

describe("movePin", () => {
  it("translates and clamps a pin", () => {
    expect(movePin(pin(), 0.1, 0.2)).toMatchObject({ x: 0.6, y: 0.7 });
    expect(movePin(pin(), 1, 1)).toMatchObject({ x: 1, y: 1 });
    expect(movePin(pin(), -1, -1)).toMatchObject({ x: 0, y: 0 });
  });
});

describe("isDrag", () => {
  it("treats small movement as a click", () => {
    expect(isDrag({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(false);
  });

  it("treats movement past the threshold as a drag", () => {
    expect(isDrag({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(true);
  });
});

describe("isPointRevealed", () => {
  const reveal = (over: Partial<MapReveal> = {}): MapReveal => ({
    id: "r",
    x: 0,
    y: 0,
    w: 0.5,
    h: 0.5,
    mode: "reveal",
    ...over,
  });

  it("is always revealed when there is no fog (no reveal rects)", () => {
    expect(isPointRevealed({ x: 0.9, y: 0.9 }, [])).toBe(true);
    expect(isPointRevealed({ x: 0.9, y: 0.9 }, [reveal({ mode: "hide" })])).toBe(true);
  });

  it("reveals points inside a reveal and hides points outside", () => {
    const reveals = [reveal()];
    expect(isPointRevealed({ x: 0.2, y: 0.2 }, reveals)).toBe(true);
    expect(isPointRevealed({ x: 0.8, y: 0.8 }, reveals)).toBe(false);
  });

  it("re-hides a point covered by a hide rect on top of a reveal", () => {
    const reveals = [reveal(), reveal({ id: "h", x: 0.1, y: 0.1, w: 0.2, h: 0.2, mode: "hide" })];
    expect(isPointRevealed({ x: 0.15, y: 0.15 }, reveals)).toBe(false);
    expect(isPointRevealed({ x: 0.4, y: 0.4 }, reveals)).toBe(true);
  });
});

describe("snapToGrid", () => {
  const grid = (over: Partial<MapGrid> = {}): MapGrid => ({
    enabled: true,
    visible: true,
    size: 0.1,
    offsetX: 0,
    offsetY: 0,
    color: "#fff",
    ...over,
  });

  it("snaps to the containing cell center", () => {
    const r = snapToGrid({ x: 0.12, y: 0.27 }, grid());
    expect(r.x).toBeCloseTo(0.15);
    expect(r.y).toBeCloseTo(0.25);
  });

  it("respects offsets", () => {
    const r = snapToGrid({ x: 0.2, y: 0.2 }, grid({ offsetX: 0.05, offsetY: 0.05 }));
    expect(r.x).toBeCloseTo(0.2);
    expect(r.y).toBeCloseTo(0.2);
  });

  it("is identity when grid is null or disabled", () => {
    expect(snapToGrid({ x: 0.123, y: 0.456 }, null)).toEqual({ x: 0.123, y: 0.456 });
    expect(snapToGrid({ x: 0.123, y: 0.456 }, grid({ enabled: false }))).toEqual({ x: 0.123, y: 0.456 });
  });

  it("keeps cells square on a non-square map via aspect", () => {
    // 2:1 map (aspect=2): a size-0.1 (width) cell spans 0.2 in height space, so
    // the y axis snaps on a 0.2 step while x still snaps on 0.1.
    const r = snapToGrid({ x: 0.12, y: 0.25 }, grid(), 2);
    expect(r.x).toBeCloseTo(0.15); // cell [0.1,0.2] → center 0.15
    expect(r.y).toBeCloseTo(0.3); // cell [0.2,0.4] → center 0.3
  });

  it("matches the unitary case when aspect is 1", () => {
    expect(snapToGrid({ x: 0.12, y: 0.27 }, grid(), 1)).toEqual(snapToGrid({ x: 0.12, y: 0.27 }, grid()));
  });
});

describe("presetTokenSize", () => {
  it("uses fixed fractions without a grid", () => {
    expect(presetTokenSize("M", null)).toBeCloseTo(0.04);
    expect(presetTokenSize("Huge", null)).toBeCloseTo(0.1);
  });

  it("scales by grid cells when a grid exists", () => {
    const grid: MapGrid = { enabled: true, visible: true, size: 0.1, offsetX: 0, offsetY: 0, color: "#fff" };
    expect(presetTokenSize("M", grid)).toBeCloseTo(0.092);
    expect(presetTokenSize("L", grid)).toBeCloseTo(0.184);
  });
});
