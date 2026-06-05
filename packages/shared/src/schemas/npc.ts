import { z } from "zod";
import { statBlock } from "./statblock.js";

export const npc = z.object({
  id: z.string(),
  campaignId: z.string().nullable(),
  name: z.string(),
  role: z.string().nullable(),
  quirk: z.string().nullable(),
  hook: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  portraitAssetId: z.string().nullable(),
  favorite: z.boolean(),
  locationId: z.string().nullable(),
  stats: statBlock,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type NPC = z.infer<typeof npc>;

export const createNpcInput = z.object({
  name: z.string().min(1).max(120),
  role: z.string().max(120).optional(),
  quirk: z.string().max(500).optional(),
  hook: z.string().max(1000).optional(),
  notes: z.string().max(8000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(40).optional(),
  portraitAssetId: z.string().optional(),
  favorite: z.boolean().optional(),
  locationId: z.string().optional(),
  campaignId: z.string().optional(),
  stats: statBlock.optional(),
});
export type CreateNpcInput = z.infer<typeof createNpcInput>;

export const updateNpcInput = createNpcInput.partial();
export type UpdateNpcInput = z.infer<typeof updateNpcInput>;

export const generateNpcInput = z.object({
  culture: z.string().max(60).optional(),
  region: z.string().max(60).optional(),
  role: z.string().max(60).optional(),
  count: z.number().int().min(1).max(20).optional(),
});
export type GenerateNpcInput = z.infer<typeof generateNpcInput>;

export const generatedNpc = z.object({
  name: z.string(),
  role: z.string(),
  quirk: z.string(),
  hook: z.string(),
  tags: z.array(z.string()),
});
export type GeneratedNpc = z.infer<typeof generatedNpc>;

export const listNpcsQuery = z.object({
  campaignId: z.string().optional(),
  includeGlobal: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => v === true || v === "true")
    .optional(),
  q: z.string().max(200).optional(),
  tag: z.string().max(40).optional(),
  favorite: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => v === true || v === "true")
    .optional(),
});
export type ListNpcsQuery = z.infer<typeof listNpcsQuery>;
