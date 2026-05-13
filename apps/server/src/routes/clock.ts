import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createClockInput, updateClockInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toClockDto } from "../lib/repos/clock.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });
const clockParams = z.object({ id: z.string().min(1), clockId: z.string().min(1) });

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
        order: count,
      },
    });
    const dto = toClockDto(created);
    await writeLog(app, id, "clock.create", `Created clock: ${dto.name}`);
    reply.code(201);
    return dto;
  });

  app.patch("/:id/clocks/:clockId", async (req) => {
    const { id, clockId } = clockParams.parse(req.params);
    const body = updateClockInput.parse(req.body);
    const updated = await prisma.progressClock.update({
      where: { id: clockId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.segments !== undefined ? { segments: body.segments } : {}),
        ...(body.filled !== undefined ? { filled: Math.max(0, body.filled) } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
      },
    });
    return toClockDto(updated);
  });

  app.delete("/:id/clocks/:clockId", async (req, reply) => {
    const { id, clockId } = clockParams.parse(req.params);
    const row = await prisma.progressClock.delete({ where: { id: clockId } });
    await writeLog(app, id, "clock.delete", `Deleted clock: ${row.name}`);
    reply.code(204).send();
  });
};
