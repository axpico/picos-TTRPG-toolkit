import { z } from "zod";

/**
 * A shared, D&D-style creature stat block reused by monsters, NPCs, party
 * members, and snapshotted onto map tokens. Every field is optional with a
 * default so partial data parses cleanly (old monster JSON, sparse NPCs, and
 * tokens saved before stats existed all round-trip without errors).
 */

export const abilityScores = z.object({
  str: z.number().int().nullable().default(null),
  dex: z.number().int().nullable().default(null),
  con: z.number().int().nullable().default(null),
  int: z.number().int().nullable().default(null),
  wis: z.number().int().nullable().default(null),
  cha: z.number().int().nullable().default(null),
});
export type AbilityScores = z.infer<typeof abilityScores>;

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];

/** A repeatable named entry — a trait, action, reaction, or legendary action. */
export const statEntry = z.object({
  id: z.string().min(1),
  name: z.string().max(120),
  desc: z.string().max(2000),
});
export type StatEntry = z.infer<typeof statEntry>;

const text = z.string().max(400).nullable().default(null);

export const statBlock = z.object({
  ac: z.number().int().nullable().default(null),
  hp: z.number().int().nullable().default(null),
  hpMax: z.number().int().nullable().default(null),
  profBonus: z.number().int().nullable().default(null),
  speed: text,
  saves: text,
  skills: text,
  senses: text,
  languages: text,
  damageResistances: text,
  damageImmunities: text,
  conditionImmunities: text,
  abilities: abilityScores.default({}),
  traits: z.array(statEntry).default([]),
  actions: z.array(statEntry).default([]),
  reactions: z.array(statEntry).default([]),
  legendary: z.array(statEntry).default([]),
});
export type StatBlock = z.infer<typeof statBlock>;

/** A fully-defaulted empty stat block. */
export const emptyStatBlock = (): StatBlock => statBlock.parse({});

/** D&D ability modifier for a score (null score → null modifier). */
export const abilityMod = (score: number | null | undefined): number | null =>
  score == null ? null : Math.floor((score - 10) / 2);

/** Format a modifier as a signed string, or an em dash when unknown. */
export const formatMod = (mod: number | null): string =>
  mod == null ? "—" : mod >= 0 ? `+${mod}` : `${mod}`;
