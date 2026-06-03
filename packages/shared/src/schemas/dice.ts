import { z } from "zod";

export const createDiceInput = z.object({
  notation: z.string().min(1),
  label: z.string().optional(),
  /** When true, the roll is GM-only and never reaches players. */
  hidden: z.boolean().optional(),
  /** Roll the leading d20 with advantage/disadvantage (keep highest/lowest of 2). */
  advantage: z.enum(["adv", "dis"]).optional(),
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
  hidden: z.boolean(),
  createdAt: z.string(),
});

export type CreateDiceInput = z.infer<typeof createDiceInput>;
export type DiceRoll = z.infer<typeof diceRoll>;
