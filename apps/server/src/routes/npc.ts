import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createNpcInput, generateNpcInput, listNpcsQuery, updateNpcInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toNpcDto } from "../lib/repos/npc.js";
import { generateNpc } from "../lib/npc-generator.js";
import { writeLog } from "../services/log.js";

const idParams = z.object({ id: z.string().min(1) });

export const npcRoutes: FastifyPluginAsync = async (app) => {
  // Library is library-wide (cross-campaign); filter via query.
  app.get("/", async (req) => {
    const q = listNpcsQuery.parse(req.query);
    const search = q.q?.trim();
    const conditions: Prisma.NPCWhereInput[] = [];
    if (q.campaignId) {
      conditions.push(
        q.includeGlobal
          ? { OR: [{ campaignId: q.campaignId }, { campaignId: null }] }
          : { campaignId: q.campaignId },
      );
    }
    if (q.favorite) conditions.push({ favorite: true });
    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search } },
          { role: { contains: search } },
          { notes: { contains: search } },
        ],
      });
    }
    const where: Prisma.NPCWhereInput = conditions.length ? { AND: conditions } : {};
    const rows = await prisma.nPC.findMany({
      where,
      orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
      take: 500,
    });
    const dtos = rows.map(toNpcDto);
    return q.tag ? dtos.filter((n: { tags: string[] }) => n.tags.includes(q.tag!)) : dtos;
  });

  app.post("/", async (req, reply) => {
    const body = createNpcInput.parse(req.body);
    const created = await prisma.nPC.create({
      data: {
        name: body.name,
        role: body.role ?? null,
        quirk: body.quirk ?? null,
        hook: body.hook ?? null,
        notes: body.notes ?? null,
        tagsJson: JSON.stringify(body.tags ?? []),
        portraitAssetId: body.portraitAssetId ?? null,
        favorite: body.favorite ?? false,
        locationId: body.locationId ?? null,
        campaignId: body.campaignId ?? null,
        statsJson: JSON.stringify(body.stats ?? {}),
      },
    });
    const dto = toNpcDto(created);
    if (dto.campaignId) {
      await writeLog(app, dto.campaignId, "npc.create", `Created NPC: ${dto.name}`);
    }
    reply.code(201);
    return dto;
  });

  app.get("/:id", async (req) => {
    const { id } = idParams.parse(req.params);
    const row = await prisma.nPC.findUniqueOrThrow({ where: { id } });
    return toNpcDto(row);
  });

  app.patch("/:id", async (req) => {
    const { id } = idParams.parse(req.params);
    const body = updateNpcInput.parse(req.body);
    const updated = await prisma.nPC.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.role !== undefined ? { role: body.role ?? null } : {}),
        ...(body.quirk !== undefined ? { quirk: body.quirk ?? null } : {}),
        ...(body.hook !== undefined ? { hook: body.hook ?? null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
        ...(body.tags !== undefined ? { tagsJson: JSON.stringify(body.tags) } : {}),
        ...(body.portraitAssetId !== undefined
          ? { portraitAssetId: body.portraitAssetId ?? null }
          : {}),
        ...(body.favorite !== undefined ? { favorite: body.favorite } : {}),
        ...(body.locationId !== undefined ? { locationId: body.locationId ?? null } : {}),
        ...(body.campaignId !== undefined ? { campaignId: body.campaignId ?? null } : {}),
        ...(body.stats !== undefined ? { statsJson: JSON.stringify(body.stats) } : {}),
      },
    });
    const dto = toNpcDto(updated);
    if (dto.campaignId) {
      await writeLog(app, dto.campaignId, "npc.update", `Updated NPC: ${dto.name}`);
    }
    return dto;
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const row = await prisma.nPC.delete({ where: { id } });
    if (row.campaignId) {
      await writeLog(app, row.campaignId, "npc.delete", `Deleted NPC: ${row.name}`);
    }
    reply.code(204).send();
  });

  app.post("/generate", async (req) => {
    const body = generateNpcInput.parse(req.body ?? {});
    const count = body.count ?? 1;
    const npcs = Array.from({ length: count }, () => generateNpc(body));
    return { npcs };
  });
};
