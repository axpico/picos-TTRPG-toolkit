import { z } from "zod";

export const combatant = z.object({
  id: z.string(),
  encounterId: z.string(),
  name: z.string(),
  initiative: z.number().int(),
  hp: z.number().int().nullable(),
  hpMax: z.number().int().nullable(),
  ac: z.number().int().nullable(),
  defeated: z.boolean(),
  conditions: z.array(z.string()),
  notes: z.string().nullable(),
  isPC: z.boolean(),
  order: z.number().int(),
});
export type Combatant = z.infer<typeof combatant>;

export const encounter = z.object({
  id: z.string(),
  campaignId: z.string(),
  name: z.string(),
  round: z.number().int(),
  currentTurn: z.number().int(),
  active: z.boolean(),
  combatants: z.array(combatant),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Encounter = z.infer<typeof encounter>;

export const createEncounterInput = z.object({
  name: z.string().min(1).max(120),
});
export type CreateEncounterInput = z.infer<typeof createEncounterInput>;

export const updateEncounterInput = z.object({
  name: z.string().min(1).max(120).optional(),
  round: z.number().int().min(1).optional(),
  currentTurn: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});
export type UpdateEncounterInput = z.infer<typeof updateEncounterInput>;

export const createCombatantInput = z.object({
  name: z.string().min(1).max(120),
  initiative: z.number().int(),
  hp: z.number().int().optional(),
  hpMax: z.number().int().optional(),
  ac: z.number().int().optional(),
  defeated: z.boolean().optional(),
  conditions: z.array(z.string().min(1).max(60)).max(40).optional(),
  notes: z.string().max(2000).optional(),
  isPC: z.boolean().optional(),
});
export type CreateCombatantInput = z.infer<typeof createCombatantInput>;

export const updateCombatantInput = createCombatantInput.partial().extend({
  order: z.number().int().optional(),
});
export type UpdateCombatantInput = z.infer<typeof updateCombatantInput>;
