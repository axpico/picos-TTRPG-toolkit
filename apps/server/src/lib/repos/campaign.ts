import { z } from "zod";
import type { Campaign as CampaignDto } from "@toolkit/shared";
import type { Campaign as DbCampaign } from "@prisma/client";
import { parseJsonField } from "../json.js";

const tagsSchema = z.array(z.string());

export function toCampaignDto(row: DbCampaign): CampaignDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tags: parseJsonField(row.tagsJson, tagsSchema, []),
    joinCode: row.joinCode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
