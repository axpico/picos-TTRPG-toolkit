import { z } from "zod";
import { emptyStatBlock, partyMemberStatus, statBlock, type PartyMember as PartyDto, type StatBlock } from "@toolkit/shared";
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
    status: partyMemberStatus.catch("active").parse(row.status),
    conditions: parseJsonField(row.conditionsJson, conditionsSchema, []),
    notes: row.notes,
    portraitAssetId: row.portraitAssetId,
    stats: parseJsonField(row.statsJson, statBlock, emptyStatBlock()) as StatBlock,
    order: row.order,
  };
}
