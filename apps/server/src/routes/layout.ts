import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { layout as layoutSchema } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toLayoutDto } from "../lib/repos/layout.js";

const params = z.object({ id: z.string().min(1) });

export const layoutRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/layout", async (req) => {
    const { id } = params.parse(req.params);
    const row = await prisma.layout.findUnique({ where: { campaignId: id } });
    return toLayoutDto(row);
  });

  app.put("/:id/layout", async (req) => {
    const { id } = params.parse(req.params);
    const body = layoutSchema.parse(req.body);
    const itemsJson = JSON.stringify(body.items);
    const updated = await prisma.layout.upsert({
      where: { campaignId: id },
      create: {
        campaignId: id,
        itemsJson,
        viewportX: body.viewport.x,
        viewportY: body.viewport.y,
        viewportScale: body.viewport.scale,
      },
      update: {
        itemsJson,
        viewportX: body.viewport.x,
        viewportY: body.viewport.y,
        viewportScale: body.viewport.scale,
      },
    });
    return toLayoutDto(updated);
  });
};
