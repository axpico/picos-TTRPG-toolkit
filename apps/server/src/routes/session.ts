import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createSessionInput, updateSessionInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toSessionDto } from "../lib/repos/session.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });
const sessParams = z.object({ id: z.string().min(1), sessionId: z.string().min(1) });
const listQuery = z.object({
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/sessions", async (req) => {
    const { id } = cidParams.parse(req.params);
    const { q, limit } = listQuery.parse(req.query);
    const search = q?.trim();
    const rows = await prisma.session.findMany({
      where: {
        campaignId: id,
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { summary: { contains: search } },
                { notes: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
    return rows.map(toSessionDto);
  });

  app.post("/:id/sessions", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createSessionInput.parse(req.body);
    const created = await prisma.session.create({
      data: {
        campaignId: id,
        title: body.title,
        date: body.date ? new Date(body.date) : null,
        summary: body.summary ?? null,
        notes: body.notes ?? null,
        externalLinksJson: JSON.stringify(body.externalLinks ?? []),
      },
    });
    const dto = toSessionDto(created);
    await writeLog(app, id, "session.create", `Created session: ${dto.title}`);
    reply.code(201);
    return dto;
  });

  app.get("/:id/sessions/:sessionId", async (req) => {
    const { sessionId } = sessParams.parse(req.params);
    const row = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    return toSessionDto(row);
  });

  app.patch("/:id/sessions/:sessionId", async (req) => {
    const { id, sessionId } = sessParams.parse(req.params);
    const body = updateSessionInput.parse(req.body);
    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.date !== undefined
          ? { date: body.date ? new Date(body.date) : null }
          : {}),
        ...(body.summary !== undefined ? { summary: body.summary ?? null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
        ...(body.externalLinks !== undefined
          ? { externalLinksJson: JSON.stringify(body.externalLinks) }
          : {}),
      },
    });
    const dto = toSessionDto(updated);
    app.bus.emit(id, {
      type: "sessions.update",
      campaignId: id,
      broadcastKey: "sessions",
      payload: { noteId: dto.id },
    });
    await writeLog(app, id, "session.update", `Updated session: ${dto.title}`);
    return dto;
  });

  app.delete("/:id/sessions/:sessionId", async (req, reply) => {
    const { id, sessionId } = sessParams.parse(req.params);
    const row = await prisma.session.delete({ where: { id: sessionId } });
    await writeLog(app, id, "session.delete", `Deleted session: ${row.title}`);
    reply.code(204).send();
  });
};
