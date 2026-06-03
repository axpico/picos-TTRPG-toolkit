import { z } from "zod";
import { statBlock } from "./statblock.js";

/**
 * Map pin in image-space (0..1 normalized to image width/height). Normalizing
 * keeps pins meaningful when the map is rendered at any size on the player view.
 */
export const mapPin = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  label: z.string().max(120),
  color: z.string().max(20),
  // When false, the pin is GM-only and excluded from the player view payload.
  playerVisible: z.boolean(),
});
export type MapPin = z.infer<typeof mapPin>;

/**
 * Fog-of-war reveal. `mode: "reveal"` exposes a rectangle of the map; the
 * player view starts fully obscured and composites reveals on top. `mode:
 * "hide"` lets the GM punch holes back into a previously revealed map (useful
 * for closing doors). Coordinates are normalized.
 */
export const mapReveal = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
  mode: z.enum(["reveal", "hide"]),
});
export type MapReveal = z.infer<typeof mapReveal>;

/**
 * A movable game piece (PC, monster, NPC) on the map. Like pins, coordinates
 * are normalized to image space; `size` is the token diameter as a fraction of
 * the image width so it scales with any render size. Tokens differ from pins in
 * that they participate in fog-of-war: a token sitting under unrevealed fog (or
 * a `hide` rect) is stripped from the player view server-side.
 */
export const mapToken = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  // Diameter as a fraction of image width.
  size: z.number().min(0.01).max(0.6),
  label: z.string().max(120),
  color: z.string().max(20),
  imageAssetId: z.string().nullable(),
  // GM-forced visibility. Even when true, fog can still hide the token.
  playerVisible: z.boolean(),
  hp: z.number().int().nullable(),
  hpMax: z.number().int().nullable(),
  // Armor class and a snapshot of the source creature's stat block (taken at
  // spawn). Defaulted so tokens saved before stats existed still parse.
  ac: z.number().int().nullable().default(null),
  statBlock: statBlock.nullable().default(null),
});
export type MapToken = z.infer<typeof mapToken>;

/** Token as returned in DTOs — adds the derived image URL (like location.imageUrl). */
export const mapTokenDto = mapToken.extend({
  imageUrl: z.string().nullable(),
});
export type MapTokenDto = z.infer<typeof mapTokenDto>;

/**
 * Optional square grid for tactical positioning. `size`/`offsetX`/`offsetY` are
 * normalized to image width. `enabled` toggles snap-to-grid; `visible` toggles
 * the drawn overlay.
 */
export const mapGrid = z.object({
  enabled: z.boolean(),
  visible: z.boolean(),
  // Cell width as a fraction of image width.
  size: z.number().min(0.005).max(1),
  offsetX: z.number().min(0).max(1),
  offsetY: z.number().min(0).max(1),
  color: z.string().max(20),
});
export type MapGrid = z.infer<typeof mapGrid>;

export const location = z.object({
  id: z.string(),
  campaignId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  gmNotes: z.string().nullable(),
  playerNotes: z.string().nullable(),
  imageAssetId: z.string().nullable(),
  pins: z.array(mapPin),
  reveals: z.array(mapReveal),
  tokens: z.array(mapTokenDto),
  grid: mapGrid.nullable(),
  // Convenience: full URL to the map image, derived server-side.
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Location = z.infer<typeof location>;

export const createLocationInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(8000).optional(),
  gmNotes: z.string().max(8000).optional(),
  playerNotes: z.string().max(8000).optional(),
  imageAssetId: z.string().optional(),
});
export type CreateLocationInput = z.infer<typeof createLocationInput>;

export const updateLocationInput = createLocationInput.partial().extend({
  // Pass arrays in full each time; pins/reveals/tokens are short and
  // immutability keeps the API surface small (no separate sub-resource routes).
  pins: z.array(mapPin).max(200).optional(),
  reveals: z.array(mapReveal).max(200).optional(),
  tokens: z.array(mapToken).max(200).optional(),
  grid: mapGrid.nullable().optional(),
  imageAssetId: z.string().nullable().optional(),
});
export type UpdateLocationInput = z.infer<typeof updateLocationInput>;

/**
 * Player-facing slice of a Location — GM notes and hidden pins are stripped, and
 * tokens are fog-filtered server-side (see {@link isPointRevealed}).
 */
export const publicLocation = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  playerNotes: z.string().nullable(),
  imageUrl: z.string().nullable(),
  pins: z.array(mapPin),
  reveals: z.array(mapReveal),
  tokens: z.array(mapTokenDto),
  grid: mapGrid.nullable(),
});
export type PublicLocation = z.infer<typeof publicLocation>;

// ---------------------------------------------------------------------------
// Pure map helpers — shared by the server (player-view filtering) and the web
// client (GM preview, snapping). Kept here so there's a single implementation.
// ---------------------------------------------------------------------------

const rectContains = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/**
 * Whether a normalized point is currently visible through the fog. Mirrors the
 * player view's fog compositing: with no `reveal` rects there is no fog (always
 * visible); otherwise a point must lie inside a `reveal` and outside every
 * `hide`.
 */
export function isPointRevealed(
  p: { x: number; y: number },
  reveals: Pick<MapReveal, "x" | "y" | "w" | "h" | "mode">[],
): boolean {
  const hasFog = reveals.some((r) => r.mode === "reveal");
  if (!hasFog) return true;
  const revealed = reveals.some((r) => r.mode === "reveal" && rectContains(r, p.x, p.y));
  if (!revealed) return false;
  const hidden = reveals.some((r) => r.mode === "hide" && rectContains(r, p.x, p.y));
  return !hidden;
}

/**
 * Snap a normalized point to the nearest grid cell center (identity if disabled).
 * `grid.size`/offsets are fractions of image width; `aspect = width/height`
 * converts the y axis so cells stay square on non-square maps.
 */
export function snapToGrid(
  p: { x: number; y: number },
  grid: MapGrid | null,
  aspect = 1,
): { x: number; y: number } {
  if (!grid || !grid.enabled || grid.size <= 0) return { x: p.x, y: p.y };
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const snap = (v: number, off: number) => off + (Math.floor((v - off) / grid.size) + 0.5) * grid.size;
  const x = snap(p.x, grid.offsetX);
  // Work in width-equivalent units on y (divide by aspect), snap, convert back.
  const a = aspect > 0 ? aspect : 1;
  const y = snap(p.y / a, grid.offsetY) * a;
  return { x: clamp01(x), y: clamp01(y) };
}

export type TokenSizePreset = "S" | "M" | "L" | "Huge";

/**
 * Token diameter for a D&D-style size preset. When a grid exists, sizes map to
 * cell counts (S/M = 1, L = 2, Huge = 3); otherwise to fixed fractions.
 */
export function presetTokenSize(preset: TokenSizePreset, grid: MapGrid | null): number {
  const cells: Record<TokenSizePreset, number> = { S: 1, M: 1, L: 2, Huge: 3 };
  if (grid && grid.size > 0) {
    // Slightly inset so tokens don't overlap cell borders.
    return Math.min(0.6, cells[preset] * grid.size * 0.92);
  }
  const fractions: Record<TokenSizePreset, number> = { S: 0.03, M: 0.04, L: 0.07, Huge: 0.1 };
  return fractions[preset];
}
