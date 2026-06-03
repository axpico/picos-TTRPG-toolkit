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
    ac: row.ac,
    defeated: row.defeated,
    conditions: parseJsonField(row.conditionsJson, conditionsSchema, []),
    notes: row.notes,
    isPC: row.isPC,
    order: row.order,
  };
}

/**
 * Keep `currentTurn` pointing at a valid combatant index after the list size
 * changes (e.g. a combatant is removed). Returns 0 when the list is empty.
 */
export function clampTurn(currentTurn: number, total: number): number {
  if (total <= 0) return 0;
  if (currentTurn < 0) return 0;
  if (currentTurn >= total) return total - 1;
  return currentTurn;
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
