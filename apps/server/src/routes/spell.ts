import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createSpellInput, listSpellsQuery, updateSpellInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toSpellDto } from "../lib/repos/spell.js";
import { getImportState, startImport } from "../lib/spell-import/importer.js";
import { writeLog } from "../services/log.js";

const idParams = z.object({ id: z.string().min(1) });
const importBody = z.object({ includeUnofficial: z.boolean().optional() }).optional();

export const spellRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (req, reply) => {
    const q = listSpellsQuery.parse(req.query);
    const search = q.q?.trim();
    const conditions: Prisma.SpellWhereInput[] = [];
    if (q.campaignId) {
      if (!(await app.assertCampaignDm(req, reply, q.campaignId))) return;
      conditions.push(
        q.includeGlobal
          ? { OR: [{ campaignId: q.campaignId }, { campaignId: null }] }
          : { campaignId: q.campaignId },
      );
    } else {
      // No campaign requested → restrict to the shared global library only,
      // never every campaign's private spells.
      conditions.push({ campaignId: null });
    }
    if (q.level !== undefined) conditions.push({ level: q.level });
    if (q.school) conditions.push({ school: q.school });
    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
          { school: { contains: search } },
        ],
      });
    }
    const where: Prisma.SpellWhereInput = conditions.length ? { AND: conditions } : {};
    const rows = await prisma.spell.findMany({
      where,
      orderBy: [{ level: "asc" }, { name: "asc" }],
      take: 1000,
    });
    let dtos = rows.map(toSpellDto);
    if (q.tag) dtos = dtos.filter((s) => s.tags.includes(q.tag!));
    if (q.class) {
      const cls = q.class.toLowerCase();
      dtos = dtos.filter((s) => s.classes.some((c) => c.toLowerCase() === cls));
    }
    return dtos;
  });

  app.post("/", async (req, reply) => {
    const body = createSpellInput.parse(req.body);
    if (!(await app.assertCampaignDm(req, reply, body.campaignId))) return;
    const created = await prisma.spell.create({
      data: {
        name: body.name,
        level: body.level ?? 0,
        school: body.school ?? null,
        castingTime: body.castingTime ?? null,
        range: body.range ?? null,
        components: body.components ?? null,
        duration: body.duration ?? null,
        description: body.description ?? "",
        higherLevels: body.higherLevels ?? null,
        classesJson: JSON.stringify(body.classes ?? []),
        ritual: body.ritual ?? false,
        concentration: body.concentration ?? false,
        source: body.source ?? null,
        tagsJson: JSON.stringify(body.tags ?? []),
        campaignId: body.campaignId ?? null,
      },
    });
    const dto = toSpellDto(created);
    if (dto.campaignId) {
      await writeLog(app, dto.campaignId, "spell.create", `Created spell: ${dto.name}`);
    }
    reply.code(201);
    return dto;
  });

  app.get("/:id", async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const row = await prisma.spell.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: { code: "not_found", message: "Spell not found." } });
    if (!(await app.assertCampaignDm(req, reply, row.campaignId))) return;
    return toSpellDto(row);
  });

  app.patch("/:id", async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const body = updateSpellInput.parse(req.body);
    const existing = await prisma.spell.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: { code: "not_found", message: "Spell not found." } });
    if (!(await app.assertCampaignDm(req, reply, existing.campaignId))) return;
    // Moving a spell into a campaign requires DM rights on the destination too.
    if (body.campaignId !== undefined && !(await app.assertCampaignDm(req, reply, body.campaignId))) return;
    const updated = await prisma.spell.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.level !== undefined ? { level: body.level } : {}),
        ...(body.school !== undefined ? { school: body.school ?? null } : {}),
        ...(body.castingTime !== undefined ? { castingTime: body.castingTime ?? null } : {}),
        ...(body.range !== undefined ? { range: body.range ?? null } : {}),
        ...(body.components !== undefined ? { components: body.components ?? null } : {}),
        ...(body.duration !== undefined ? { duration: body.duration ?? null } : {}),
        ...(body.description !== undefined ? { description: body.description ?? "" } : {}),
        ...(body.higherLevels !== undefined ? { higherLevels: body.higherLevels ?? null } : {}),
        ...(body.classes !== undefined ? { classesJson: JSON.stringify(body.classes) } : {}),
        ...(body.ritual !== undefined ? { ritual: body.ritual } : {}),
        ...(body.concentration !== undefined ? { concentration: body.concentration } : {}),
        ...(body.source !== undefined ? { source: body.source ?? null } : {}),
        ...(body.tags !== undefined ? { tagsJson: JSON.stringify(body.tags) } : {}),
        ...(body.campaignId !== undefined ? { campaignId: body.campaignId ?? null } : {}),
      },
    });
    const dto = toSpellDto(updated);
    if (dto.campaignId) {
      app.bus.emit(dto.campaignId, {
        type: "spells.update",
        campaignId: dto.campaignId,
        broadcastKey: "spells",
        payload: { spellId: dto.id },
      });
      await writeLog(app, dto.campaignId, "spell.update", `Updated spell: ${dto.name}`);
    }
    return dto;
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const existing = await prisma.spell.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: { code: "not_found", message: "Spell not found." } });
    if (!(await app.assertCampaignDm(req, reply, existing.campaignId))) return;
    const row = await prisma.spell.delete({ where: { id } });
    if (row.campaignId) {
      await writeLog(app, row.campaignId, "spell.delete", `Deleted spell: ${row.name}`);
    }
    reply.code(204).send();
  });

  // Kick off a full import from dnd5e.wikidot.com into the global library.
  app.post("/import", async (req, reply) => {
    const body = importBody.parse(req.body ?? undefined);
    const started = startImport({
      log: app.log,
      includeUnofficial: body?.includeUnofficial ?? false,
    });
    reply.code(started ? 202 : 409);
    return { started, status: getImportState() };
  });

  app.get("/import/status", async () => getImportState());
};
