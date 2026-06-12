import { z } from "zod";

export const SPELL_SCHOOLS = [
  "abjuration",
  "conjuration",
  "divination",
  "enchantment",
  "evocation",
  "illusion",
  "necromancy",
  "transmutation",
] as const;

export const spell = z.object({
  id: z.string(),
  campaignId: z.string().nullable(),
  name: z.string(),
  /** Wikidot page slug for imported spells; null for custom spells. */
  slug: z.string().nullable(),
  /** 0 = cantrip. */
  level: z.number().int().min(0).max(9),
  school: z.string().nullable(),
  castingTime: z.string().nullable(),
  range: z.string().nullable(),
  components: z.string().nullable(),
  duration: z.string().nullable(),
  /** Markdown body. */
  description: z.string(),
  higherLevels: z.string().nullable(),
  classes: z.array(z.string()),
  ritual: z.boolean(),
  concentration: z.boolean(),
  source: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Spell = z.infer<typeof spell>;

export const createSpellInput = z.object({
  name: z.string().min(1).max(120),
  level: z.number().int().min(0).max(9).optional(),
  school: z.string().max(60).optional(),
  castingTime: z.string().max(120).optional(),
  range: z.string().max(120).optional(),
  components: z.string().max(400).optional(),
  duration: z.string().max(120).optional(),
  description: z.string().max(20000).optional(),
  higherLevels: z.string().max(8000).optional(),
  classes: z.array(z.string().min(1).max(40)).max(20).optional(),
  ritual: z.boolean().optional(),
  concentration: z.boolean().optional(),
  source: z.string().max(120).optional(),
  tags: z.array(z.string().min(1).max(40)).max(40).optional(),
  campaignId: z.string().optional(),
});
export type CreateSpellInput = z.infer<typeof createSpellInput>;

export const updateSpellInput = createSpellInput.partial();
export type UpdateSpellInput = z.infer<typeof updateSpellInput>;

export const listSpellsQuery = z.object({
  campaignId: z.string().optional(),
  includeGlobal: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => v === true || v === "true")
    .optional(),
  q: z.string().max(200).optional(),
  level: z.coerce.number().int().min(0).max(9).optional(),
  school: z.string().max(60).optional(),
  class: z.string().max(40).optional(),
  tag: z.string().max(40).optional(),
});
export type ListSpellsQuery = z.infer<typeof listSpellsQuery>;

export const spellImportStatus = z.object({
  status: z.enum(["idle", "running", "done", "error"]),
  total: z.number().int(),
  done: z.number().int(),
  failed: z.array(z.string()),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  error: z.string().nullable(),
});
export type SpellImportStatus = z.infer<typeof spellImportStatus>;
