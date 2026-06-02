import type { MapPin, MapReveal } from "@toolkit/shared";

/** A normalized 0..1 point in image space. */
export interface Point {
  x: number;
  y: number;
}

/** Minimum width/height for a reveal rectangle, in normalized units. */
export const MIN_REVEAL = 0.02;

/** Pixel distance below which a pointer gesture counts as a click, not a drag. */
export const DRAG_THRESHOLD = 4;

export const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * Convert client (viewport) coordinates to normalized 0..1 image-space coords
 * using a rendered element's bounding rect. Because getBoundingClientRect
 * already reflects any zoom/pan transform, this stays correct at any scale.
 */
export function toNormalized(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): Point {
  const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
  const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
  return { x: clamp01(x), y: clamp01(y) };
}

/**
 * Build a normalized rectangle from two corner points dragged in any direction.
 * Enforces a minimum size so a stray click doesn't create an invisible reveal.
 */
export function drawReveal(start: Point, end: Point): { x: number; y: number; w: number; h: number } {
  const x0 = clamp01(Math.min(start.x, end.x));
  const y0 = clamp01(Math.min(start.y, end.y));
  const x1 = clamp01(Math.max(start.x, end.x));
  const y1 = clamp01(Math.max(start.y, end.y));
  const w = Math.max(MIN_REVEAL, x1 - x0);
  const h = Math.max(MIN_REVEAL, y1 - y0);
  // Keep the rect inside bounds after enforcing the minimum size.
  const x = Math.min(x0, 1 - w);
  const y = Math.min(y0, 1 - h);
  return { x, y, w, h };
}

/** Translate a reveal by a normalized delta, clamped so it stays fully in bounds. */
export function moveReveal(reveal: MapReveal, dx: number, dy: number): MapReveal {
  const x = Math.max(0, Math.min(1 - reveal.w, reveal.x + dx));
  const y = Math.max(0, Math.min(1 - reveal.h, reveal.y + dy));
  return { ...reveal, x, y };
}

/** Which handle of a reveal is being dragged. */
export type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

/**
 * Resize a reveal by dragging one of its handles by a normalized delta. The
 * opposite edge stays fixed; the moving edge is clamped to bounds and to a
 * minimum size so the rectangle can't invert or vanish.
 */
export function resizeReveal(reveal: MapReveal, handle: ResizeHandle, dx: number, dy: number): MapReveal {
  let { x, y, w, h } = reveal;
  const right = x + w;
  const bottom = y + h;

  if (handle.includes("w")) {
    const nx = Math.max(0, Math.min(right - MIN_REVEAL, x + dx));
    w = right - nx;
    x = nx;
  }
  if (handle.includes("e")) {
    const nr = Math.min(1, Math.max(x + MIN_REVEAL, right + dx));
    w = nr - x;
  }
  if (handle.includes("n")) {
    const ny = Math.max(0, Math.min(bottom - MIN_REVEAL, y + dy));
    h = bottom - ny;
    y = ny;
  }
  if (handle.includes("s")) {
    const nb = Math.min(1, Math.max(y + MIN_REVEAL, bottom + dy));
    h = nb - y;
  }

  return { ...reveal, x, y, w, h };
}

/** Move a pin by a normalized delta, clamped to bounds. */
export function movePin(pin: MapPin, dx: number, dy: number): MapPin {
  return { ...pin, x: clamp01(pin.x + dx), y: clamp01(pin.y + dy) };
}

/**
 * Discriminate a drag from a click using pixel distance between gesture start
 * and end. Below the threshold the gesture is treated as a click.
 */
export function isDrag(
  start: { x: number; y: number },
  end: { x: number; y: number },
  threshold = DRAG_THRESHOLD,
): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) >= threshold;
}
