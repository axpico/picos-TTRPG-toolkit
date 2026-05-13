import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createCombatantInput,
  createEncounterInput,
  updateCombatantInput,
  updateEncounterInput,
} from "@toolkit/shared";
import { prisma } from "../db.js";
import { toCombatantDto, toEncounterDto } from "../lib/repos/combat.js";
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

  app.patch("/:id/encounters/:encounterId", async (req) => {
    const { id, encounterId } = encParams.parse(req.params);
    const body = updateEncounterInput.parse(req.body);
    const before = await prisma.encounter.findUniqueOrThrow({ where: { id: encounterId } });
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
    const row = await prisma.encounter.delete({ where: { id: encounterId } });
    emit(app, id, "combat.delete", { id: row.id });
    await writeLog(app, id, "combat.delete", `Deleted encounter: ${row.name}`);
    reply.code(204).send();
  });

  app.post("/:id/encounters/:encounterId/next-turn", async (req) => {
    const { id, encounterId } = encParams.parse(req.params);
    const enc = await prisma.encounter.findUniqueOrThrow({
      where: { id: encounterId },
      include: { combatants: true },
    });
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
    const count = await prisma.combatant.count({ where: { encounterId } });
    const created = await prisma.combatant.create({
      data: {
        encounterId,
        name: body.name,
        initiative: body.initiative,
        hp: body.hp ?? null,
        hpMax: body.hpMax ?? null,
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

  app.patch("/:id/encounters/:encounterId/combatants/:combatantId", async (req) => {
    const { id, encounterId, combatantId } = combatantParams.parse(req.params);
    const body = updateCombatantInput.parse(req.body);
    const updated = await prisma.combatant.update({
      where: { id: combatantId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.initiative !== undefined ? { initiative: body.initiative } : {}),
        ...(body.hp !== undefined ? { hp: body.hp ?? null } : {}),
        ...(body.hpMax !== undefined ? { hpMax: body.hpMax ?? null } : {}),
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
    const removed = await prisma.combatant.delete({ where: { id: combatantId } });
    const enc = await prisma.encounter.findUniqueOrThrow({
      where: { id: encounterId },
      include: { combatants: true },
    });
    const dto = toEncounterDto(enc);
    emit(app, id, "combat.update", { encounter: dto });
    await writeLog(app, id, "combat.combatant.remove", `Removed ${removed.name} from "${enc.name}"`);
    reply.code(204).send();
  });
};
