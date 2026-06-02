import { z } from "zod";

export const createDiceInput = z.object({
  notation: z.string().min(1),
  label: z.string().optional(),
});

export const diceRoll = z.object({
  id: z.string(),
  campaignId: z.string().nullable(),
  userId: z.string().nullable(),
  rollerName: z.string().nullable(),
  notation: z.string(),
  result: z.number(),
  breakdownJson: z.string(),
  label: z.string().nullable(),
  createdAt: z.string(),
});

export type CreateDiceInput = z.infer<typeof createDiceInput>;
export type DiceRoll = z.infer<typeof diceRoll>;
