import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createDiceInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { rollWithMode } from "../lib/dice.js";
import { toDiceDto, visibleRolls, type Roller } from "../lib/repos/dice.js";

const cidParams = z.object({ id: z.string().min(1) });

export const diceRoutes: FastifyPluginAsync = async (app) => {
  const member = { preHandler: app.requireCampaignRole() };

  app.get("/:id/dice", member, async (req) => {
    const { id } = cidParams.parse(req.params);
    const rows = await prisma.diceRoll.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { displayName: true, username: true } } },
    });
    const dtos = rows.map((r) => toDiceDto(r, r.user));
    // Players must never receive the DM's hidden rolls, even via direct call.
    return visibleRolls(dtos, req.membership?.role);
  });

  app.post("/:id/dice", member, async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createDiceInput.parse(req.body);
    // Only the DM may roll hidden.
    const hidden = body.hidden === true && req.membership?.role === "dm";
    const rolled = rollWithMode(body.notation, body.advantage);
    const created = await prisma.diceRoll.create({
      data: {
        campaignId: id,
        userId: req.user!.id,
        notation: body.notation,
        result: rolled.total,
        breakdownJson: rolled.breakdownJson,
        label: body.label ?? null,
        hidden,
      },
    });
    const roller: Roller = { displayName: req.user!.displayName, username: req.user!.username };
    const dto = toDiceDto(created, roller);
    // Hidden rolls carry no broadcastKey, so the player stream filter drops them.
    app.bus.emit(id, {
      type: "dice.roll",
      campaignId: id,
      ...(hidden ? {} : { broadcastKey: "dice" }),
      payload: { roll: dto },
    });
    reply.code(201);
    return dto;
  });
};
