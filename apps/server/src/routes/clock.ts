import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createClockInput, updateClockInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toClockDto } from "../lib/repos/clock.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });
const clockParams = z.object({ id: z.string().min(1), clockId: z.string().min(1) });

const BROADCAST_KEY = "clocks";

function emit(
  app: import("fastify").FastifyInstance,
  campaignId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  app.bus.emit(campaignId, { type, campaignId, broadcastKey: BROADCAST_KEY, payload });
}

export const clockRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/clocks", async (req) => {
    const { id } = cidParams.parse(req.params);
    const rows = await prisma.progressClock.findMany({
      where: { campaignId: id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toClockDto);
  });

  app.post("/:id/clocks", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createClockInput.parse(req.body);
    const count = await prisma.progressClock.count({ where: { campaignId: id } });
    const created = await prisma.progressClock.create({
      data: {
        campaignId: id,
        name: body.name,
        segments: body.segments ?? 6,
        filled: body.filled ?? 0,
        description: body.description ?? null,
        color: body.color ?? "#6366f1",
        secret: body.secret ?? false,
        order: count,
      },
    });
    const dto = toClockDto(created);
    emit(app, id, "clock.create", { clock: dto });
    await writeLog(app, id, "clock.create", `Created clock: ${dto.name}`);
    reply.code(201);
    return dto;
  });

  app.patch("/:id/clocks/:clockId", async (req, reply) => {
    const { id, clockId } = clockParams.parse(req.params);
    const body = updateClockInput.parse(req.body);
    const owned = await prisma.progressClock.findFirst({ where: { id: clockId, campaignId: id }, select: { id: true } });
    if (!owned) return reply.code(404).send({ error: { code: "not_found", message: "Clock not found." } });
    const updated = await prisma.progressClock.update({
      where: { id: clockId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.segments !== undefined ? { segments: body.segments } : {}),
        ...(body.filled !== undefined ? { filled: Math.max(0, body.filled) } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.secret !== undefined ? { secret: body.secret } : {}),
        ...(body.order !== undefined ? { order: body.order } : {}),
      },
    });
    const dto = toClockDto(updated);
    emit(app, id, "clock.update", { clock: dto });
    return dto;
  });

  app.delete("/:id/clocks/:clockId", async (req, reply) => {
    const { id, clockId } = clockParams.parse(req.params);
    const owned = await prisma.progressClock.findFirst({ where: { id: clockId, campaignId: id }, select: { id: true, name: true } });
    if (!owned) return reply.code(404).send({ error: { code: "not_found", message: "Clock not found." } });
    await prisma.progressClock.delete({ where: { id: clockId } });
    emit(app, id, "clock.delete", { id: owned.id });
    await writeLog(app, id, "clock.delete", `Deleted clock: ${owned.name}`);
    reply.code(204).send();
  });
};
