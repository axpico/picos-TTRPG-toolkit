import { z } from "zod";

export const progressClock = z.object({
  id: z.string(),
  campaignId: z.string(),
  name: z.string(),
  segments: z.number().int(),
  filled: z.number().int(),
  description: z.string().nullable(),
  color: z.string(),
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProgressClock = z.infer<typeof progressClock>;

export const createClockInput = z.object({
  name: z.string().min(1).max(120),
  segments: z.number().int().min(2).max(20).default(6),
  filled: z.number().int().min(0).default(0),
  description: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
});
export type CreateClockInput = z.infer<typeof createClockInput>;

export const updateClockInput = z.object({
  name: z.string().min(1).max(120).optional(),
  segments: z.number().int().min(2).max(20).optional(),
  filled: z.number().int().min(0).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().max(20).optional(),
});
export type UpdateClockInput = z.infer<typeof updateClockInput>;
