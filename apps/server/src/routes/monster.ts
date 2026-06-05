import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createMonsterInput, listMonstersQuery, updateMonsterInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toMonsterDto } from "../lib/repos/monster.js";
import { writeLog } from "../services/log.js";

const idParams = z.object({ id: z.string().min(1) });

export const monsterRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (req) => {
    const q = listMonstersQuery.parse(req.query);
    const search = q.q?.trim();
    const conditions: Prisma.MonsterWhereInput[] = [];
    if (q.campaignId) {
      conditions.push(
        q.includeGlobal
          ? { OR: [{ campaignId: q.campaignId }, { campaignId: null }] }
          : { campaignId: q.campaignId },
      );
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
      },
    });
    const dto = toMonsterDto(created);
    if (dto.campaignId) {
      await writeLog(app, dto.campaignId, "monster.create", `Created creature: ${dto.name}`);
    }
    reply.code(201);
    return dto;
  });

  app.get("/:id", async (req) => {
    const { id } = idParams.parse(req.params);
    const row = await prisma.monster.findUniqueOrThrow({ where: { id } });
    return toMonsterDto(row);
  });

  app.patch("/:id", async (req) => {
    const { id } = idParams.parse(req.params);
    const body = updateMonsterInput.parse(req.body);
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
      },
    });
    const dto = toMonsterDto(updated);
    if (dto.campaignId) {
      await writeLog(app, dto.campaignId, "monster.update", `Updated creature: ${dto.name}`);
    }
    return dto;
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const row = await prisma.monster.delete({ where: { id } });
    if (row.campaignId) {
      await writeLog(app, row.campaignId, "monster.delete", `Deleted creature: ${row.name}`);
    }
    reply.code(204).send();
  });
};
