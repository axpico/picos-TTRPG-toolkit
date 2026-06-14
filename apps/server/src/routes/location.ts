import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createLocationInput, updateLocationInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toLocationDto } from "../lib/repos/location.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });
const itemParams = z.object({ id: z.string().min(1), locationId: z.string().min(1) });

export const locationRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/locations", async (req) => {
    const { id } = cidParams.parse(req.params);
    const rows = await prisma.location.findMany({
      where: { campaignId: id },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toLocationDto);
  });

  app.post("/:id/locations", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createLocationInput.parse(req.body);
    const created = await prisma.location.create({
      data: {
        campaignId: id,
        name: body.name,
        description: body.description ?? null,
        gmNotes: body.gmNotes ?? null,
        playerNotes: body.playerNotes ?? null,
        imageAssetId: body.imageAssetId ?? null,
      },
    });
    const dto = toLocationDto(created);
    app.bus.emit(id, {
      type: "location.update",
      campaignId: id,
      broadcastKey: "map:current",
      payload: { location: dto },
    });
    await writeLog(app, id, "location.create", `Created location: ${dto.name}`);
    reply.code(201);
    return dto;
  });

  app.get("/:id/locations/:locationId", async (req, reply) => {
    const { id, locationId } = itemParams.parse(req.params);
    const row = await prisma.location.findFirst({ where: { id: locationId, campaignId: id } });
    if (!row) return reply.code(404).send({ error: { code: "not_found", message: "Location not found." } });
    return toLocationDto(row);
  });

  app.patch("/:id/locations/:locationId", async (req, reply) => {
    const { id, locationId } = itemParams.parse(req.params);
    const body = updateLocationInput.parse(req.body);
    const owned = await prisma.location.findFirst({ where: { id: locationId, campaignId: id }, select: { id: true } });
    if (!owned) return reply.code(404).send({ error: { code: "not_found", message: "Location not found." } });
    const updated = await prisma.location.update({
      where: { id: locationId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
        ...(body.gmNotes !== undefined ? { gmNotes: body.gmNotes ?? null } : {}),
        ...(body.playerNotes !== undefined ? { playerNotes: body.playerNotes ?? null } : {}),
        ...(body.imageAssetId !== undefined
          ? { imageAssetId: body.imageAssetId ?? null }
          : {}),
        ...(body.pins !== undefined ? { pinsJson: JSON.stringify(body.pins) } : {}),
        ...(body.reveals !== undefined ? { revealsJson: JSON.stringify(body.reveals) } : {}),
        ...(body.tokens !== undefined ? { tokensJson: JSON.stringify(body.tokens) } : {}),
        ...(body.grid !== undefined ? { gridJson: body.grid ? JSON.stringify(body.grid) : null } : {}),
      },
    });
    const dto = toLocationDto(updated);
    app.bus.emit(id, {
      type: "location.update",
      campaignId: id,
      broadcastKey: "map:current",
      payload: { location: dto },
    });
    await writeLog(app, id, "location.update", `Updated location: ${dto.name}`);
    return dto;
  });

  app.delete("/:id/locations/:locationId", async (req, reply) => {
    const { id, locationId } = itemParams.parse(req.params);
    const owned = await prisma.location.findFirst({ where: { id: locationId, campaignId: id }, select: { id: true, name: true } });
    if (!owned) return reply.code(404).send({ error: { code: "not_found", message: "Location not found." } });
    await prisma.location.delete({ where: { id: locationId } });
    app.bus.emit(id, {
      type: "location.update",
      campaignId: id,
      broadcastKey: "map:current",
      payload: { id: owned.id, deleted: true },
    });
    await writeLog(app, id, "location.delete", `Deleted location: ${owned.name}`);
    reply.code(204).send();
  });
};
