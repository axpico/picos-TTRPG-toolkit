import { z } from "zod";

export const timer = z.object({
  id: z.string(),
  campaignId: z.string(),
  name: z.string(),
  durationSeconds: z.number().int(),
  /** Absolute instant the timer reaches zero while running; null when paused/idle. */
  endsAt: z.string().nullable(),
  /** Frozen remaining seconds when not running. */
  remainingSeconds: z.number().int(),
  color: z.string(),
  secret: z.boolean(),
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Timer = z.infer<typeof timer>;

export const createTimerInput = z.object({
  name: z.string().min(1).max(120),
  durationSeconds: z.number().int().min(1).max(86_400).default(300),
  color: z.string().max(20).optional(),
  secret: z.boolean().optional(),
});
// Use the input type so the zod-defaulted field (durationSeconds) stays optional
// for callers — the schema fills it in at parse time on the server.
export type CreateTimerInput = z.input<typeof createTimerInput>;

export const updateTimerInput = z.object({
  name: z.string().min(1).max(120).optional(),
  durationSeconds: z.number().int().min(1).max(86_400).optional(),
  endsAt: z.string().datetime().nullable().optional(),
  remainingSeconds: z.number().int().min(0).optional(),
  color: z.string().max(20).optional(),
  secret: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});
export type UpdateTimerInput = z.infer<typeof updateTimerInput>;
