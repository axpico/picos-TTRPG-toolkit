import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createDiceInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { rollNotation } from "../lib/dice.js";

const cidParams = z.object({ id: z.string().min(1) });

export const diceRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/dice", async (req) => {
    const { id } = cidParams.parse(req.params);
    const rows = await prisma.diceRoll.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, take: 200 });
    return rows.map((r) => ({
      id: r.id,
      campaignId: r.campaignId,
      notation: r.notation,
      result: r.result,
      breakdownJson: r.breakdownJson,
      label: r.label,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  app.post("/:id/dice", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createDiceInput.parse(req.body);
    const rolled = rollNotation(body.notation);
    const created = await prisma.diceRoll.create({
      data: {
        campaignId: id,
        notation: body.notation,
        result: rolled.total,
        breakdownJson: rolled.breakdownJson,
        label: body.label ?? null,
      },
    });
    reply.code(201);
    return {
      id: created.id,
      campaignId: created.campaignId,
      notation: created.notation,
      result: created.result,
      breakdownJson: created.breakdownJson,
      label: created.label,
      createdAt: created.createdAt.toISOString(),
    };
  });
};
