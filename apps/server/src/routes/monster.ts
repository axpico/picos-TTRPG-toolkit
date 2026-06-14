import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createMonsterInput, listMonstersQuery, updateMonsterInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toMonsterDto } from "../lib/repos/monster.js";
import { writeLog } from "../services/log.js";

const idParams = z.object({ id: z.string().min(1) });

export const monsterRoutes: FastifyPluginAsync = async (app) => {
  // Library a given user may see: shared read-only seed (null owner) + own rows.
  const libraryVisibleTo = (uid: string | null): Prisma.MonsterWhereInput => ({
    campaignId: null,
    OR: [{ ownerUserId: null }, ...(uid ? [{ ownerUserId: uid }] : [])],
  });

  app.get("/", async (req, reply) => {
    const q = listMonstersQuery.parse(req.query);
    const uid = await app.getUserId(req);
    const search = q.q?.trim();
    const conditions: Prisma.MonsterWhereInput[] = [];
    if (q.campaignId) {
      if (!(await app.assertCampaignDm(req, reply, q.campaignId))) return;
      conditions.push(
        q.includeGlobal
          ? { OR: [{ campaignId: q.campaignId }, libraryVisibleTo(uid)] }
          : { campaignId: q.campaignId },
      );
    } else {
      // No campaign requested → library view: shared seed + the caller's own rows.
      conditions.push(libraryVisibleTo(uid));
    }
    if (q.type) conditions.push({ type: q.type });
    if (q.environment) conditions.push({ environment: q.environment });
    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search } },
          { type: { contains: search } },
          { notes: { contains: search } },
        ],
      });
    }
    const where: Prisma.MonsterWhereInput = conditions.length ? { AND: conditions } : {};
    const rows = await prisma.monster.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: 500,
    });
    const dtos = rows.map(toMonsterDto);
    return q.tag ? dtos.filter((m) => m.tags.includes(q.tag!)) : dtos;
  });

  app.post("/", async (req, reply) => {
    const body = createMonsterInput.parse(req.body);
    if (!(await app.assertCampaignDm(req, reply, body.campaignId))) return;
    const uid = await app.getUserId(req);
    const ownerUserId = body.campaignId ? null : uid;
    const created = await prisma.monster.create({
      data: {
        name: body.name,
        type: body.type ?? null,
        environment: body.environment ?? null,
        challenge: body.challenge ?? null,
        statsJson: JSON.stringify(body.stats ?? {}),
        notes: body.notes ?? null,
        tagsJson: JSON.stringify(body.tags ?? []),
        campaignId: body.campaignId ?? null,
        ownerUserId,
      },
    });
    const dto = toMonsterDto(created);
    if (dto.campaignId) {
      await writeLog(app, dto.campaignId, "monster.create", `Created creature: ${dto.name}`);
    }
    reply.code(201);
    return dto;
  });

  app.get("/:id", async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const row = await prisma.monster.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: { code: "not_found", message: "Creature not found." } });
    if (!(await app.assertCanReadRow(req, reply, row))) return;
    return toMonsterDto(row);
  });

  app.patch("/:id", async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const body = updateMonsterInput.parse(req.body);
    const existing = await prisma.monster.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: { code: "not_found", message: "Creature not found." } });
    if (!(await app.assertCanWriteRow(req, reply, existing))) return;
    let ownerPatch: { ownerUserId?: string | null } = {};
    if (body.campaignId !== undefined) {
      if (body.campaignId) {
        if (!(await app.assertCampaignDm(req, reply, body.campaignId))) return;
        ownerPatch = { ownerUserId: null };
      } else {
        ownerPatch = { ownerUserId: await app.getUserId(req) };
      }
    }
    const updated = await prisma.monster.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type ?? null } : {}),
        ...(body.environment !== undefined ? { environment: body.environment ?? null } : {}),
        ...(body.challenge !== undefined ? { challenge: body.challenge ?? null } : {}),
        ...(body.stats !== undefined ? { statsJson: JSON.stringify(body.stats) } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
        ...(body.tags !== undefined ? { tagsJson: JSON.stringify(body.tags) } : {}),
        ...(body.campaignId !== undefined ? { campaignId: body.campaignId ?? null } : {}),
        ...ownerPatch,
      },
    });
    const dto = toMonsterDto(updated);
    if (dto.campaignId) {
      app.bus.emit(dto.campaignId, {
        type: "bestiary.update",
        campaignId: dto.campaignId,
        broadcastKey: "bestiary",
        payload: { monsterId: dto.id },
      });
      await writeLog(app, dto.campaignId, "monster.update", `Updated creature: ${dto.name}`);
    }
    return dto;
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const existing = await prisma.monster.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: { code: "not_found", message: "Creature not found." } });
    if (!(await app.assertCanWriteRow(req, reply, existing))) return;
    const row = await prisma.monster.delete({ where: { id } });
    if (row.campaignId) {
      await writeLog(app, row.campaignId, "monster.delete", `Deleted creature: ${row.name}`);
    }
    reply.code(204).send();
  });
};
