import type { FastifyInstance } from "fastify";
import type { LogEntryKind } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toLogDto } from "../lib/repos/log.js";

export async function writeLog(
  app: FastifyInstance,
  campaignId: string,
  kind: LogEntryKind,
  message: string,
  data?: Record<string, unknown>,
) {
  const row = await prisma.logEntry.create({
    data: {
      campaignId,
      kind,
      message,
      dataJson: data ? JSON.stringify(data) : null,
    },
  });
  // Gated by the "log" broadcast: the player Session Log feed only receives
  // entries while the GM is broadcasting it.
  app.bus.emit(campaignId, {
    type: "log.append",
    campaignId,
    broadcastKey: "log",
    payload: { entry: toLogDto(row) },
  });
  return row;
}
