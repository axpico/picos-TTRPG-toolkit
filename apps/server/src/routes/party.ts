import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createPartyMemberInput, updatePartyMemberInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toPartyDto } from "../lib/repos/party.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });
const memberParams = z.object({ id: z.string().min(1), memberId: z.string().min(1) });

export const partyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/party", async (req) => {
    const { id } = cidParams.parse(req.params);
    const rows = await prisma.partyMember.findMany({
      where: { campaignId: id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toPartyDto);
  });

  app.post("/:id/party", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createPartyMemberInput.parse(req.body);
    const count = await prisma.partyMember.count({ where: { campaignId: id } });
    const created = await prisma.partyMember.create({
      data: {
        campaignId: id,
        name: body.name,
        playerName: body.playerName ?? null,
        hp: body.hp ?? 0,
        hpMax: body.hpMax ?? 0,
        gold: body.gold ?? 0,
        status: body.status ?? "active",
        conditionsJson: JSON.stringify(body.conditions ?? []),
        notes: body.notes ?? null,
        statsJson: JSON.stringify(body.stats ?? {}),
        order: count,
      },
    });
    const dto = toPartyDto(created);
    app.bus.emit(id, { type: "party.create", campaignId: id, broadcastKey: "party", payload: { member: dto } });
    await writeLog(app, id, "party.create", `Added party member: ${dto.name}`);
    reply.code(201);
    return dto;
  });

  app.patch("/:id/party/:memberId", async (req) => {
    const { id, memberId } = memberParams.parse(req.params);
    const body = updatePartyMemberInput.parse(req.body);
    const updated = await prisma.partyMember.update({
      where: { id: memberId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.userId !== undefined ? { userId: body.userId } : {}),
        ...(body.playerName !== undefined ? { playerName: body.playerName ?? null } : {}),
        ...(body.hp !== undefined ? { hp: body.hp } : {}),
        ...(body.hpMax !== undefined ? { hpMax: body.hpMax } : {}),
        ...(body.gold !== undefined ? { gold: body.gold } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.conditions !== undefined
          ? { conditionsJson: JSON.stringify(body.conditions) }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
        ...(body.stats !== undefined ? { statsJson: JSON.stringify(body.stats) } : {}),
        ...(body.order !== undefined ? { order: body.order } : {}),
      },
    });
    const dto = toPartyDto(updated);
    app.bus.emit(id, { type: "party.update", campaignId: id, broadcastKey: "party", payload: { member: dto } });
    await writeLog(app, id, "party.update", `Updated party member: ${dto.name}`);
    return dto;
  });

  app.delete("/:id/party/:memberId", async (req, reply) => {
    const { id, memberId } = memberParams.parse(req.params);
    const row = await prisma.partyMember.delete({ where: { id: memberId } });
    app.bus.emit(id, { type: "party.delete", campaignId: id, broadcastKey: "party", payload: { id: row.id } });
    await writeLog(app, id, "party.delete", `Removed party member: ${row.name}`);
    reply.code(204).send();
  });
};
