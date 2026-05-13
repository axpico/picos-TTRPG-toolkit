import { z } from "zod";

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
  // Pass arrays in full each time; pins/reveals are short and immutability
  // keeps the API surface small (no separate pin endpoints).
  pins: z.array(mapPin).max(200).optional(),
  reveals: z.array(mapReveal).max(200).optional(),
  imageAssetId: z.string().nullable().optional(),
});
export type UpdateLocationInput = z.infer<typeof updateLocationInput>;

/** Player-facing slice of a Location — GM notes and hidden pins are stripped. */
export const publicLocation = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  playerNotes: z.string().nullable(),
  imageUrl: z.string().nullable(),
  pins: z.array(mapPin),
  reveals: z.array(mapReveal),
});
export type PublicLocation = z.infer<typeof publicLocation>;
