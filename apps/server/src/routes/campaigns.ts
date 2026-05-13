import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createCampaignInput, updateCampaignInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toCampaignDto } from "../lib/repos/campaign.js";
import { generateShareToken } from "../lib/share-token.js";

const idParams = z.object({ id: z.string().min(1) });

export const campaignRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => {
    const rows = await prisma.campaign.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map(toCampaignDto);
  });

  app.post("/", async (req, reply) => {
    const body = createCampaignInput.parse(req.body);
    const created = await prisma.campaign.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        tagsJson: JSON.stringify(body.tags ?? []),
        shareToken: generateShareToken(),
        layout: { create: {} },
      },
    });
    reply.code(201);
    return toCampaignDto(created);
  });

  app.get("/:id", async (req) => {
    const { id } = idParams.parse(req.params);
    const row = await prisma.campaign.findUniqueOrThrow({ where: { id } });
    return toCampaignDto(row);
  });

  app.patch("/:id", async (req) => {
    const { id } = idParams.parse(req.params);
    const body = updateCampaignInput.parse(req.body);
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.tags !== undefined ? { tagsJson: JSON.stringify(body.tags) } : {}),
      },
    });
    app.bus.emit(id, { type: "campaign.update", campaignId: id });
    return toCampaignDto(updated);
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = idParams.parse(req.params);
    await prisma.campaign.delete({ where: { id } });
    reply.code(204).send();
  });

  app.post("/:id/share-token/rotate", async (req) => {
    const { id } = idParams.parse(req.params);
    const updated = await prisma.campaign.update({
      where: { id },
      data: { shareToken: generateShareToken() },
    });
    return toCampaignDto(updated);
  });
};
