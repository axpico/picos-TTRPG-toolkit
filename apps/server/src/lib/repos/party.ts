import { z } from "zod";
import type { PartyMember as PartyDto } from "@toolkit/shared";
import { partyMemberStatus } from "@toolkit/shared";
import type { PartyMember as DbPartyMember } from "@prisma/client";
import { parseJsonField } from "../json.js";

const conditionsSchema = z.array(z.string());

export function toPartyDto(row: DbPartyMember): PartyDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    playerName: row.playerName,
    hp: row.hp,
    hpMax: row.hpMax,
    status: partyMemberStatus.catch("active").parse(row.status),
    conditions: parseJsonField(row.conditionsJson, conditionsSchema, []),
    notes: row.notes,
    portraitAssetId: row.portraitAssetId,
    order: row.order,
  };
}
