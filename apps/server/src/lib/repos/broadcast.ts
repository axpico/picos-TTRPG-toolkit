import { z } from "zod";
import type { Broadcast as BroadcastDto } from "@toolkit/shared";
import type { Broadcast as DbBroadcast } from "@prisma/client";
import { parseJsonField } from "../json.js";

const payloadSchema = z.record(z.unknown());

export function toBroadcastDto(row: DbBroadcast): BroadcastDto {
  return {
    campaignId: row.campaignId,
    widgetKey: row.widgetKey,
    active: row.active,
    payload: parseJsonField(row.payloadJson, payloadSchema, {}),
    updatedAt: row.updatedAt.toISOString(),
  };
}
