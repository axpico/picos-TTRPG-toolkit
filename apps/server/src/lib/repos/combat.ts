import { z } from "zod";
import type { Combatant as CombatantDto, Encounter as EncounterDto } from "@toolkit/shared";
import type { Combatant as DbCombatant, Encounter as DbEncounter } from "@prisma/client";
import { parseJsonField } from "../json.js";

const conditionsSchema = z.array(z.string());

export function toCombatantDto(row: DbCombatant): CombatantDto {
  return {
    id: row.id,
    encounterId: row.encounterId,
    name: row.name,
    initiative: row.initiative,
    hp: row.hp,
    hpMax: row.hpMax,
    conditions: parseJsonField(row.conditionsJson, conditionsSchema, []),
    notes: row.notes,
    isPC: row.isPC,
    order: row.order,
  };
}

export function toEncounterDto(row: DbEncounter & { combatants: DbCombatant[] }): EncounterDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    round: row.round,
    currentTurn: row.currentTurn,
    active: row.active,
    combatants: row.combatants
      .slice()
      .sort((a, b) => a.order - b.order || b.initiative - a.initiative)
      .map(toCombatantDto),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
