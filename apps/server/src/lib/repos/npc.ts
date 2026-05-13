import { z } from "zod";
import type { NPC as NpcDto } from "@toolkit/shared";
import type { NPC as DbNpc } from "@prisma/client";
import { parseJsonField } from "../json.js";

const tagsSchema = z.array(z.string());

export function toNpcDto(row: DbNpc): NpcDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    role: row.role,
    quirk: row.quirk,
    hook: row.hook,
    notes: row.notes,
    tags: parseJsonField(row.tagsJson, tagsSchema, []),
    portraitAssetId: row.portraitAssetId,
    favorite: row.favorite,
    locationId: row.locationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
