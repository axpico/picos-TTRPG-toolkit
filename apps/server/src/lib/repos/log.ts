import { z } from "zod";
import type { LogEntry as LogDto } from "@toolkit/shared";
import { logEntryKind } from "@toolkit/shared";
import type { LogEntry as DbLogEntry } from "@prisma/client";
import { parseJsonField } from "../json.js";

const dataSchema = z.record(z.unknown());

export function toLogDto(row: DbLogEntry): LogDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    kind: logEntryKind.catch("other").parse(row.kind),
    message: row.message,
    data: row.dataJson ? parseJsonField(row.dataJson, dataSchema, {}) : null,
    createdAt: row.createdAt.toISOString(),
  };
}
