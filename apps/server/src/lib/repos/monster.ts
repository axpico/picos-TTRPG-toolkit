import { z } from "zod";
import type { Monster as MonsterDto } from "@toolkit/shared";
import type { Monster as DbMonster } from "@prisma/client";
import { parseJsonField } from "../json.js";

const tagsSchema = z.array(z.string());
const statsSchema = z.record(z.unknown());

export function toMonsterDto(row: DbMonster): MonsterDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    type: row.type,
    environment: row.environment,
    challenge: row.challenge,
    stats: parseJsonField(row.statsJson, statsSchema, {}),
    notes: row.notes,
    tags: parseJsonField(row.tagsJson, tagsSchema, []),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
