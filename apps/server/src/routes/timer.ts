import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createTimerInput, updateTimerInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toTimerDto } from "../lib/repos/timer.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });
const timerParams = z.object({ id: z.string().min(1), timerId: z.string().min(1) });

const BROADCAST_KEY = "timers";

function emit(
  app: import("fastify").FastifyInstance,
  campaignId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  app.bus.emit(campaignId, { type, campaignId, broadcastKey: BROADCAST_KEY, payload });
}

export const timerRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/timers", async (req) => {
    const { id } = cidParams.parse(req.params);
    const rows = await prisma.timer.findMany({
      where: { campaignId: id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toTimerDto);
  });

  app.post("/:id/timers", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createTimerInput.parse(req.body);
    const duration = body.durationSeconds ?? 300;
    const count = await prisma.timer.count({ where: { campaignId: id } });
    const created = await prisma.timer.create({
      data: {
        campaignId: id,
        name: body.name,
        durationSeconds: duration,
        endsAt: null,
        remainingSeconds: duration,
        color: body.color ?? "#ef4444",
        secret: body.secret ?? false,
        order: count,
      },
    });
    const dto = toTimerDto(created);
    emit(app, id, "timer.create", { timer: dto });
    await writeLog(app, id, "timer.create", `Created timer: ${dto.name}`);
    reply.code(201);
    return dto;
  });

  app.patch("/:id/timers/:timerId", async (req) => {
    const { id, timerId } = timerParams.parse(req.params);
    const body = updateTimerInput.parse(req.body);
    const updated = await prisma.timer.update({
      where: { id: timerId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.durationSeconds !== undefined ? { durationSeconds: body.durationSeconds } : {}),
        ...(body.endsAt !== undefined ? { endsAt: body.endsAt ? new Date(body.endsAt) : null } : {}),
        ...(body.remainingSeconds !== undefined
          ? { remainingSeconds: Math.max(0, body.remainingSeconds) }
          : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.secret !== undefined ? { secret: body.secret } : {}),
        ...(body.order !== undefined ? { order: body.order } : {}),
      },
    });
    const dto = toTimerDto(updated);
    emit(app, id, "timer.update", { timer: dto });
    return dto;
  });

  app.delete("/:id/timers/:timerId", async (req, reply) => {
    const { id, timerId } = timerParams.parse(req.params);
    const row = await prisma.timer.delete({ where: { id: timerId } });
    emit(app, id, "timer.delete", { id: row.id });
    await writeLog(app, id, "timer.delete", `Deleted timer: ${row.name}`);
    reply.code(204).send();
  });
};
