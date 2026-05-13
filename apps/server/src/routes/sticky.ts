import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createStickyNoteInput, updateStickyNoteInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toStickyDto } from "../lib/repos/sticky.js";

const cidParams = z.object({ id: z.string().min(1) });
const itemParams = z.object({ id: z.string().min(1), noteId: z.string().min(1) });

export const stickyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/sticky-notes", async (req) => {
    const { id } = cidParams.parse(req.params);
    const rows = await prisma.stickyNote.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toStickyDto);
  });

  app.post("/:id/sticky-notes", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createStickyNoteInput.parse(req.body ?? {});
    const created = await prisma.stickyNote.create({
      data: {
        campaignId: id,
        text: body.text ?? "",
        color: body.color ?? "#fde68a",
        x: body.x ?? 0,
        y: body.y ?? 0,
        width: body.width ?? 220,
        height: body.height ?? 160,
      },
    });
    const dto = toStickyDto(created);
    app.bus.emit(id, {
      type: "sticky.update",
      campaignId: id,
      payload: { note: dto },
    });
    reply.code(201);
    return dto;
  });

  app.patch("/:id/sticky-notes/:noteId", async (req) => {
    const { id, noteId } = itemParams.parse(req.params);
    const body = updateStickyNoteInput.parse(req.body);
    const updated = await prisma.stickyNote.update({
      where: { id: noteId },
      data: {
        ...(body.text !== undefined ? { text: body.text } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.x !== undefined ? { x: body.x } : {}),
        ...(body.y !== undefined ? { y: body.y } : {}),
        ...(body.width !== undefined ? { width: body.width } : {}),
        ...(body.height !== undefined ? { height: body.height } : {}),
      },
    });
    const dto = toStickyDto(updated);
    app.bus.emit(id, {
      type: "sticky.update",
      campaignId: id,
      payload: { note: dto },
    });
    return dto;
  });

  app.delete("/:id/sticky-notes/:noteId", async (req, reply) => {
    const { id, noteId } = itemParams.parse(req.params);
    const row = await prisma.stickyNote.delete({ where: { id: noteId } });
    app.bus.emit(id, {
      type: "sticky.delete",
      campaignId: id,
      payload: { id: row.id },
    });
    reply.code(204).send();
  });
};
