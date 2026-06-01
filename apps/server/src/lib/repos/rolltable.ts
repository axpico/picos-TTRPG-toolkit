import { z } from "zod";
import { rollTableEntry, type RollTable as RollTableDto, type RollTableEntry } from "@toolkit/shared";
import type { RollTable as DbRollTable } from "@prisma/client";
import { parseJsonField } from "../json.js";

const entriesSchema = z.array(rollTableEntry);

export function toRollTableDto(row: DbRollTable): RollTableDto {
  const entries = parseJsonField<RollTableEntry[]>(row.entriesJson, entriesSchema, []);
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    description: row.description,
    entries,
    order: row.order,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
