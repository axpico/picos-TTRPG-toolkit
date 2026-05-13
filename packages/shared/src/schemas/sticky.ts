import { z } from "zod";

/**
 * Sticky notes live directly on the canvas plane (not as widgets) — they own
 * their position and size and are persisted per-campaign so layouts and notes
 * stay aligned.
 */
export const stickyNote = z.object({
  id: z.string(),
  campaignId: z.string(),
  text: z.string(),
  color: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StickyNote = z.infer<typeof stickyNote>;

export const createStickyNoteInput = z.object({
  text: z.string().max(8000).optional(),
  color: z.string().max(20).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().positive().max(2000).optional(),
  height: z.number().positive().max(2000).optional(),
});
export type CreateStickyNoteInput = z.infer<typeof createStickyNoteInput>;

export const updateStickyNoteInput = createStickyNoteInput.partial();
export type UpdateStickyNoteInput = z.infer<typeof updateStickyNoteInput>;

export const STICKY_COLORS = [
  "#fde68a", // amber  — default
  "#fca5a5", // red
  "#bef264", // lime
  "#a5b4fc", // indigo
  "#f0abfc", // fuchsia
  "#e5e7eb", // grey
] as const;
