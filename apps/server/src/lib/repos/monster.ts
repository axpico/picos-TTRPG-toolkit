import { z } from "zod";
import { emptyStatBlock, statBlock, type Monster as MonsterDto, type StatBlock } from "@toolkit/shared";
import type { Monster as DbMonster } from "@prisma/client";
import { parseJsonField } from "../json.js";

const tagsSchema = z.array(z.string());

export function toMonsterDto(row: DbMonster): MonsterDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    type: row.type,
    environment: row.environment,
    challenge: row.challenge,
    stats: parseJsonField(row.statsJson, statBlock, emptyStatBlock()) as StatBlock,
    notes: row.notes,
    tags: parseJsonField(row.tagsJson, tagsSchema, []),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
