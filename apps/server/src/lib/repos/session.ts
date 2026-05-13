import { z } from "zod";
import { externalLink, type SessionEntry } from "@toolkit/shared";
import type { Session as DbSession } from "@prisma/client";
import { parseJsonField } from "../json.js";

const linksSchema = z.array(externalLink);

export function toSessionDto(row: DbSession): SessionEntry {
  return {
    id: row.id,
    campaignId: row.campaignId,
    title: row.title,
    date: row.date ? row.date.toISOString() : null,
    summary: row.summary,
    notes: row.notes,
    externalLinks: parseJsonField(row.externalLinksJson, linksSchema, []),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
