import { z } from "zod";
import { statBlock } from "./statblock.js";

export const monster = z.object({
  id: z.string(),
  campaignId: z.string().nullable(),
  name: z.string(),
  type: z.string().nullable(),
  environment: z.string().nullable(),
  challenge: z.string().nullable(),
  stats: statBlock,
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Monster = z.infer<typeof monster>;

export const createMonsterInput = z.object({
  name: z.string().min(1).max(120),
  type: z.string().max(60).optional(),
  environment: z.string().max(60).optional(),
  challenge: z.string().max(40).optional(),
  stats: statBlock.optional(),
  notes: z.string().max(8000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(40).optional(),
  campaignId: z.string().optional(),
});
export type CreateMonsterInput = z.infer<typeof createMonsterInput>;

export const updateMonsterInput = createMonsterInput.partial();
export type UpdateMonsterInput = z.infer<typeof updateMonsterInput>;

export const listMonstersQuery = z.object({
  campaignId: z.string().optional(),
  includeGlobal: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => v === true || v === "true")
    .optional(),
  q: z.string().max(200).optional(),
  tag: z.string().max(40).optional(),
  type: z.string().max(60).optional(),
  environment: z.string().max(60).optional(),
});
export type ListMonstersQuery = z.infer<typeof listMonstersQuery>;
