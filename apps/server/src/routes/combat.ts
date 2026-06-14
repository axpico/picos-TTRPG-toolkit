import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createCombatantInput,
  createEncounterInput,
  updateCombatantInput,
  updateEncounterInput,
} from "@toolkit/shared";
import { prisma } from "../db.js";
import { clampTurn, toCombatantDto, toEncounterDto } from "../lib/repos/combat.js";
import { rollNotation } from "../lib/dice.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });
const encParams = z.object({ id: z.string().min(1), encounterId: z.string().min(1) });
const combatantParams = z.object({
  id: z.string().min(1),
  encounterId: z.string().min(1),
  combatantId: z.string().min(1),
});

const BROADCAST_KEY = "combat";

function emit(app: import("fastify").FastifyInstance, campaignId: string, type: string, payload: Record<string, unknown>) {
  app.bus.emit(campaignId, {
    type,
    campaignId,
    broadcastKey: BROADCAST_KEY,
    payload,
  });
}

export const combatRoutes: FastifyPluginAsync = async (app) => {
  // Load an encounter only if it belongs to the given campaign. Prevents
  // cross-campaign access via a foreign encounterId on a campaign route the
  // caller legitimately DMs.
  const loadEncounter = (encounterId: string, campaignId: string) =>
    prisma.encounter.findFirst({
      where: { id: encounterId, campaignId },
      include: { combatants: true },
    });

  app.get("/:id/encounters", async (req) => {
    const { id } = cidParams.parse(req.params);
    const rows = await prisma.encounter.findMany({
      where: { campaignId: id },
      include: { combatants: true },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(toEncounterDto);
  });

  app.post("/:id/encounters", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createEncounterInput.parse(req.body);
    const created = await prisma.encounter.create({
      data: { campaignId: id, name: body.name },
      include: { combatants: true },
    });
    const dto = toEncounterDto(created);
    emit(app, id, "combat.create", { encounter: dto });
    await writeLog(app, id, "combat.create", `Created encounter: ${dto.name}`);
    reply.code(201);
    return dto;
  });

  app.patch("/:id/encounters/:encounterId", async (req, reply) => {
    const { id, encounterId } = encParams.parse(req.params);
    const body = updateEncounterInput.parse(req.body);
    const before = await loadEncounter(encounterId, id);
    if (!before) return reply.code(404).send({ error: { code: "not_found", message: "Encounter not found." } });
    const updated = await prisma.encounter.update({
      where: { id: encounterId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.round !== undefined ? { round: body.round } : {}),
        ...(body.currentTurn !== undefined ? { currentTurn: body.currentTurn } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
      include: { combatants: true },
    });
    const dto = toEncounterDto(updated);
    emit(app, id, "combat.update", { encounter: dto });
    if (body.active !== undefined && body.active !== before.active) {
      await writeLog(
        app,
        id,
        body.active ? "combat.start" : "combat.end",
        `${body.active ? "Started" : "Ended"} encounter: ${dto.name}`,
      );
    }
    if (body.round !== undefined && body.round !== before.round) {
      await writeLog(app, id, "combat.round", `Encounter "${dto.name}" round ${body.round}`);
    }
    if (body.currentTurn !== undefined && body.currentTurn !== before.currentTurn) {
      const c = dto.combatants[body.currentTurn];
      await writeLog(
        app,
        id,
        "combat.turn",
        `Turn: ${c ? c.name : `#${body.currentTurn}`} (${dto.name})`,
      );
    }
    return dto;
  });

  app.delete("/:id/encounters/:encounterId", async (req, reply) => {
    const { id, encounterId } = encParams.parse(req.params);
    const owned = await prisma.encounter.findFirst({ where: { id: encounterId, campaignId: id }, select: { id: true, name: true } });
    if (!owned) return reply.code(404).send({ error: { code: "not_found", message: "Encounter not found." } });
    await prisma.encounter.delete({ where: { id: encounterId } });
    emit(app, id, "combat.delete", { id: owned.id });
    await writeLog(app, id, "combat.delete", `Deleted encounter: ${owned.name}`);
    reply.code(204).send();
  });

  app.post("/:id/encounters/:encounterId/next-turn", async (req, reply) => {
    const { id, encounterId } = encParams.parse(req.params);
    const enc = await loadEncounter(encounterId, id);
    if (!enc) return reply.code(404).send({ error: { code: "not_found", message: "Encounter not found." } });
    const total = enc.combatants.length;
    if (total === 0) {
      return toEncounterDto(enc);
    }
    let nextTurn = enc.currentTurn + 1;
    let nextRound = enc.round;
    if (nextTurn >= total) {
      nextTurn = 0;
      nextRound += 1;
    }
    const updated = await prisma.encounter.update({
      where: { id: encounterId },
      data: { currentTurn: nextTurn, round: nextRound, active: true },
      include: { combatants: true },
    });
    const dto = toEncounterDto(updated);
    emit(app, id, "combat.update", { encounter: dto });
    const c = dto.combatants[nextTurn];
    if (nextRound !== enc.round) {
      await writeLog(app, id, "combat.round", `Encounter "${dto.name}" round ${nextRound}`);
    }
    await writeLog(app, id, "combat.turn", `Turn: ${c ? c.name : `#${nextTurn}`} (${dto.name})`);
    return dto;
  });

  app.post("/:id/encounters/:encounterId/combatants", async (req, reply) => {
    const { id, encounterId } = encParams.parse(req.params);
    const body = createCombatantInput.parse(req.body);
    const ownedEnc = await prisma.encounter.findFirst({ where: { id: encounterId, campaignId: id }, select: { id: true } });
    if (!ownedEnc) return reply.code(404).send({ error: { code: "not_found", message: "Encounter not found." } });
    const count = await prisma.combatant.count({ where: { encounterId } });
    const created = await prisma.combatant.create({
      data: {
        encounterId,
        name: body.name,
        initiative: body.initiative,
        hp: body.hp ?? null,
        hpMax: body.hpMax ?? null,
        ac: body.ac ?? null,
        defeated: body.defeated ?? false,
        conditionsJson: JSON.stringify(body.conditions ?? []),
        notes: body.notes ?? null,
        isPC: body.isPC ?? false,
        order: count,
      },
    });
    const enc = await prisma.encounter.findUniqueOrThrow({
      where: { id: encounterId },
      include: { combatants: true },
    });
    const dto = toEncounterDto(enc);
    emit(app, id, "combat.update", { encounter: dto });
    await writeLog(app, id, "combat.combatant.add", `Added ${body.name} to encounter "${enc.name}"`);
    reply.code(201);
    return toCombatantDto(created);
  });

  app.patch("/:id/encounters/:encounterId/combatants/:combatantId", async (req, reply) => {
    const { id, encounterId, combatantId } = combatantParams.parse(req.params);
    const body = updateCombatantInput.parse(req.body);
    const ownedC = await prisma.combatant.findFirst({ where: { id: combatantId, encounterId, encounter: { campaignId: id } }, select: { id: true } });
    if (!ownedC) return reply.code(404).send({ error: { code: "not_found", message: "Combatant not found." } });
    const updated = await prisma.combatant.update({
      where: { id: combatantId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.initiative !== undefined ? { initiative: body.initiative } : {}),
        ...(body.hp !== undefined ? { hp: body.hp ?? null } : {}),
        ...(body.hpMax !== undefined ? { hpMax: body.hpMax ?? null } : {}),
        ...(body.ac !== undefined ? { ac: body.ac ?? null } : {}),
        ...(body.defeated !== undefined ? { defeated: body.defeated } : {}),
        ...(body.conditions !== undefined
          ? { conditionsJson: JSON.stringify(body.conditions) }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
        ...(body.isPC !== undefined ? { isPC: body.isPC } : {}),
        ...(body.order !== undefined ? { order: body.order } : {}),
      },
    });
    const enc = await prisma.encounter.findUniqueOrThrow({
      where: { id: encounterId },
      include: { combatants: true },
    });
    const dto = toEncounterDto(enc);
    emit(app, id, "combat.update", { encounter: dto });
    return toCombatantDto(updated);
  });

  app.delete("/:id/encounters/:encounterId/combatants/:combatantId", async (req, reply) => {
    const { id, encounterId, combatantId } = combatantParams.parse(req.params);
    const ownedC = await prisma.combatant.findFirst({ where: { id: combatantId, encounterId, encounter: { campaignId: id } }, select: { id: true } });
    if (!ownedC) return reply.code(404).send({ error: { code: "not_found", message: "Combatant not found." } });
    const removed = await prisma.combatant.delete({ where: { id: combatantId } });
    let enc = await prisma.encounter.findUniqueOrThrow({
      where: { id: encounterId },
      include: { combatants: true },
    });
    // Keep the turn marker in range now that a combatant is gone.
    const clamped = clampTurn(enc.currentTurn, enc.combatants.length);
    if (clamped !== enc.currentTurn) {
      enc = await prisma.encounter.update({
        where: { id: encounterId },
        data: { currentTurn: clamped },
        include: { combatants: true },
      });
    }
    const dto = toEncounterDto(enc);
    emit(app, id, "combat.update", { encounter: dto });
    await writeLog(app, id, "combat.combatant.remove", `Removed ${removed.name} from "${enc.name}"`);
    reply.code(204).send();
  });

  // Step the turn marker backwards (wrapping to the previous round).
  app.post("/:id/encounters/:encounterId/prev-turn", async (req, reply) => {
    const { id, encounterId } = encParams.parse(req.params);
    const enc = await loadEncounter(encounterId, id);
    if (!enc) return reply.code(404).send({ error: { code: "not_found", message: "Encounter not found." } });
    const total = enc.combatants.length;
    if (total === 0) return toEncounterDto(enc);
    let nextTurn = enc.currentTurn - 1;
    let nextRound = enc.round;
    if (nextTurn < 0) {
      nextTurn = total - 1;
      nextRound = Math.max(1, enc.round - 1);
    }
    const updated = await prisma.encounter.update({
      where: { id: encounterId },
      data: { currentTurn: nextTurn, round: nextRound },
      include: { combatants: true },
    });
    const dto = toEncounterDto(updated);
    emit(app, id, "combat.update", { encounter: dto });
    return dto;
  });

  // Roll 1d20 initiative for every combatant (optionally NPCs only).
  app.post("/:id/encounters/:encounterId/roll-initiative", async (req, reply) => {
    const { id, encounterId } = encParams.parse(req.params);
    const body = z.object({ onlyNpc: z.boolean().optional() }).parse(req.body ?? {});
    const enc = await loadEncounter(encounterId, id);
    if (!enc) return reply.code(404).send({ error: { code: "not_found", message: "Encounter not found." } });
    const targets = body.onlyNpc ? enc.combatants.filter((c) => !c.isPC) : enc.combatants;
    await prisma.$transaction(
      targets.map((c) =>
        prisma.combatant.update({
          where: { id: c.id },
          data: { initiative: rollNotation("1d20").total },
        }),
      ),
    );
    const updated = await prisma.encounter.findUniqueOrThrow({
      where: { id: encounterId },
      include: { combatants: true },
    });
    const dto = toEncounterDto(updated);
    emit(app, id, "combat.update", { encounter: dto });
    await writeLog(app, id, "combat.initiative", `Rolled initiative for "${dto.name}"`);
    return dto;
  });
};
