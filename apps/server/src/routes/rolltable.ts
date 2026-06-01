import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createRollTableInput,
  updateRollTableInput,
  type RollTableResult,
} from "@toolkit/shared";
import { prisma } from "../db.js";
import { toRollTableDto } from "../lib/repos/rolltable.js";
import { pickWeighted } from "../lib/table.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });
const tableParams = z.object({ id: z.string().min(1), tableId: z.string().min(1) });

/** Singleton broadcast key: "the latest random-table result on display". */
const BROADCAST_KEY = "rolltable:current";

export const rollTableRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/rolltables", async (req) => {
    const { id } = cidParams.parse(req.params);
    const rows = await prisma.rollTable.findMany({
      where: { campaignId: id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toRollTableDto);
  });

  app.post("/:id/rolltables", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createRollTableInput.parse(req.body);
    const count = await prisma.rollTable.count({ where: { campaignId: id } });
    const created = await prisma.rollTable.create({
      data: {
        campaignId: id,
        name: body.name,
        description: body.description ?? null,
        entriesJson: JSON.stringify(body.entries ?? []),
        order: count,
      },
    });
    reply.code(201);
    return toRollTableDto(created);
  });

  app.patch("/:id/rolltables/:tableId", async (req) => {
    const { tableId } = tableParams.parse(req.params);
    const body = updateRollTableInput.parse(req.body);
    const updated = await prisma.rollTable.update({
      where: { id: tableId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
        ...(body.entries !== undefined ? { entriesJson: JSON.stringify(body.entries) } : {}),
      },
    });
    return toRollTableDto(updated);
  });

  app.delete("/:id/rolltables/:tableId", async (req, reply) => {
    const { tableId } = tableParams.parse(req.params);
    await prisma.rollTable.delete({ where: { id: tableId } });
    reply.code(204).send();
  });

  app.post("/:id/rolltables/:tableId/roll", async (req, reply) => {
    const { id, tableId } = tableParams.parse(req.params);
    const row = await prisma.rollTable.findFirst({ where: { id: tableId, campaignId: id } });
    if (!row) {
      reply.code(404).send({ error: { code: "not_found", message: "Table not found." } });
      return;
    }
    const dto = toRollTableDto(row);
    if (dto.entries.length === 0) {
      reply.code(400).send({ error: { code: "empty_table", message: "Table has no entries." } });
      return;
    }

    const { index, entry } = pickWeighted(dto.entries);
    const result: RollTableResult = {
      tableId: dto.id,
      tableName: dto.name,
      text: entry.text,
      index,
    };

    await writeLog(app, id, "table.roll", `Rolled on ${dto.name}: ${entry.text}`, { ...result });

    // If this campaign is currently broadcasting table results, refresh the
    // stored payload so the player view's initial fetch shows the new result,
    // and push it live to connected players.
    const broadcast = await prisma.broadcast.findUnique({
      where: { campaignId_widgetKey: { campaignId: id, widgetKey: BROADCAST_KEY } },
    });
    if (broadcast?.active) {
      await prisma.broadcast.update({
        where: { campaignId_widgetKey: { campaignId: id, widgetKey: BROADCAST_KEY } },
        data: { payloadJson: JSON.stringify(result) },
      });
      app.bus.emit(id, {
        type: "rolltable.roll",
        campaignId: id,
        broadcastKey: BROADCAST_KEY,
        payload: { result },
      });
    }

    reply.code(201);
    return result;
  });
};
