import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createDiceInput } from "@toolkit/shared";
import type { DiceRoll as DbDiceRoll } from "@prisma/client";
import { prisma } from "../db.js";
import { rollNotation } from "../lib/dice.js";

const cidParams = z.object({ id: z.string().min(1) });

type Roller = { displayName: string | null; username: string } | null;

function toDiceDto(r: DbDiceRoll, roller: Roller) {
  return {
    id: r.id,
    campaignId: r.campaignId,
    userId: r.userId,
    rollerName: roller ? roller.displayName ?? roller.username : null,
    notation: r.notation,
    result: r.result,
    breakdownJson: r.breakdownJson,
    label: r.label,
    createdAt: r.createdAt.toISOString(),
  };
}

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
    return rows.map((r) => toDiceDto(r, r.user));
  });

  app.post("/:id/dice", member, async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createDiceInput.parse(req.body);
    const rolled = rollNotation(body.notation);
    const created = await prisma.diceRoll.create({
      data: {
        campaignId: id,
        userId: req.user!.id,
        notation: body.notation,
        result: rolled.total,
        breakdownJson: rolled.breakdownJson,
        label: body.label ?? null,
      },
    });
    const roller: Roller = { displayName: req.user!.displayName, username: req.user!.username };
    const dto = toDiceDto(created, roller);
    app.bus.emit(id, { type: "dice.roll", campaignId: id, payload: { roll: dto } });
    reply.code(201);
    return dto;
  });
};
