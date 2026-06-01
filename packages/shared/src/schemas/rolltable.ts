import { z } from "zod";

export const rollTableEntry = z.object({
  weight: z.number().int().min(1).max(1000),
  text: z.string().min(1).max(500),
});
export type RollTableEntry = z.infer<typeof rollTableEntry>;

export const rollTable = z.object({
  id: z.string(),
  campaignId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  entries: z.array(rollTableEntry),
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RollTable = z.infer<typeof rollTable>;

export const createRollTableInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  entries: z.array(rollTableEntry).optional(),
});
export type CreateRollTableInput = z.infer<typeof createRollTableInput>;

export const updateRollTableInput = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  entries: z.array(rollTableEntry).optional(),
});
export type UpdateRollTableInput = z.infer<typeof updateRollTableInput>;

/** The outcome of rolling on a table — used by the roll endpoint, the SSE
 * payload, and the broadcasted player view. */
export const rollTableResult = z.object({
  tableId: z.string(),
  tableName: z.string(),
  text: z.string(),
  index: z.number().int(),
});
export type RollTableResult = z.infer<typeof rollTableResult>;
