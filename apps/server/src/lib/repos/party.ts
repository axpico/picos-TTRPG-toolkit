import { z } from "zod";
import {
  emptyStatBlock,
  partyMemberStatus,
  statBlock,
  type PartyMember as PartyDto,
  type PublicPartyMember as PublicPartyDto,
  type StatBlock,
} from "@toolkit/shared";
import type { PartyMember as DbPartyMember } from "@prisma/client";
import { parseJsonField } from "../json.js";

const conditionsSchema = z.array(z.string());

export function toPartyDto(row: DbPartyMember): PartyDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    userId: row.userId,
    name: row.name,
    playerName: row.playerName,
    hp: row.hp,
    hpMax: row.hpMax,
    gold: row.gold,
    status: partyMemberStatus.catch("active").parse(row.status),
    conditions: parseJsonField(row.conditionsJson, conditionsSchema, []),
    notes: row.notes,
    portraitAssetId: row.portraitAssetId,
    stats: parseJsonField(row.statsJson, statBlock, emptyStatBlock()) as StatBlock,
    order: row.order,
  };
}

/**
 * Player-safe party member. Drops owner/DM-private fields (`notes`, `gold`,
 * `stats`, `playerName`) so they never reach the player view or the gated party
 * SSE events. Players see their own full character via the `my-character` route.
 */
export function toPublicPartyDto(row: DbPartyMember): PublicPartyDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    userId: row.userId,
    name: row.name,
    hp: row.hp,
    hpMax: row.hpMax,
    status: partyMemberStatus.catch("active").parse(row.status),
    conditions: parseJsonField(row.conditionsJson, conditionsSchema, []),
    portraitAssetId: row.portraitAssetId,
    order: row.order,
  };
}
