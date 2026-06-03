import type { LayoutItem } from "@toolkit/shared";

/** Axis-aligned bounding box covering every item, in canvas pixels. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

/** A canvas transform: top-left offset plus scale. */
export interface Transform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Compute the bounding box covering every item, in canvas pixels.
 * Returns `null` when there are no items.
 */
export function itemsBounds(items: LayoutItem[]): Bounds | null {
  if (items.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const it of items) {
    minX = Math.min(minX, it.x);
    minY = Math.min(minY, it.y);
    maxX = Math.max(maxX, it.x + it.w);
    maxY = Math.max(maxY, it.y + it.h);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/**
 * Compute the transform that fits `bounds` centered in a viewport of `vw`×`vh`.
 * The scale is clamped to `[minScale, maxScale]`; `padding` (px) is kept around
 * the content on all sides. Uses react-zoom-pan-pinch's model where a content
 * point maps to screen via `screen = position + scale * content`.
 */
export function fitTransform(
  bounds: Bounds,
  vw: number,
  vh: number,
  opts: { padding?: number; minScale?: number; maxScale?: number } = {},
): Transform {
  const pad = opts.padding ?? 80;
  const min = opts.minScale ?? 0.25;
  const max = opts.maxScale ?? 3;
  // Floor the divisors so a zero-size bbox (single point) clamps to maxScale
  // instead of producing Infinity/NaN.
  const w = Math.max(bounds.w, 1);
  const h = Math.max(bounds.h, 1);
  const scale = Math.max(
    min,
    Math.min(max, Math.min((vw - pad * 2) / w, (vh - pad * 2) / h)),
  );
  const cx = bounds.minX + bounds.w / 2;
  const cy = bounds.minY + bounds.h / 2;
  return { x: vw / 2 - scale * cx, y: vh / 2 - scale * cy, scale };
}
