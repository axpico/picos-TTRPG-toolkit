import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { setBroadcastInput, setBroadcastsInput } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toBroadcastDto } from "../lib/repos/broadcast.js";

const idParams = z.object({ id: z.string().min(1) });
const keyParams = z.object({ id: z.string().min(1), widgetKey: z.string().min(1) });

export const broadcastRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/broadcasts", async (req) => {
    const { id } = idParams.parse(req.params);
    const rows = await prisma.broadcast.findMany({ where: { campaignId: id } });
    return rows.map(toBroadcastDto);
  });

  // Number of players currently watching the live player view.
  app.get("/:id/presence", async (req) => {
    const { id } = idParams.parse(req.params);
    return { count: app.bus.presence(id) };
  });

  // Batch toggle (Share All / Hide All). Flips `active` for the given keys in one
  // call, then emits a single broadcast.change so streams refresh once.
  app.put("/:id/broadcasts", async (req) => {
    const { id } = idParams.parse(req.params);
    const body = setBroadcastsInput.parse(req.body);
    await prisma.$transaction(
      body.widgetKeys.map((widgetKey) =>
        prisma.broadcast.upsert({
          where: { campaignId_widgetKey: { campaignId: id, widgetKey } },
          create: { campaignId: id, widgetKey, active: body.active, payloadJson: "{}" },
          update: { active: body.active },
        }),
      ),
    );
    app.bus.emit(id, {
      type: "broadcast.change",
      campaignId: id,
      payload: { active: body.active, batch: true },
    });
    const rows = await prisma.broadcast.findMany({ where: { campaignId: id } });
    return rows.map(toBroadcastDto);
  });

  app.put("/:id/broadcasts/:widgetKey", async (req) => {
    const { id, widgetKey } = keyParams.parse(req.params);
    const body = setBroadcastInput.parse(req.body);
    const payloadJson = JSON.stringify(body.payload ?? {});
    const row = await prisma.broadcast.upsert({
      where: { campaignId_widgetKey: { campaignId: id, widgetKey } },
      create: {
        campaignId: id,
        widgetKey,
        active: body.active,
        payloadJson,
      },
      update: {
        active: body.active,
        ...(body.payload !== undefined ? { payloadJson } : {}),
      },
    });

    app.bus.emit(id, {
      type: "broadcast.change",
      campaignId: id,
      broadcastKey: widgetKey,
      payload: { active: row.active, widgetKey },
    });

    return toBroadcastDto(row);
  });

  app.delete("/:id/broadcasts/:widgetKey", async (req, reply) => {
    const { id, widgetKey } = keyParams.parse(req.params);
    await prisma.broadcast.delete({
      where: { campaignId_widgetKey: { campaignId: id, widgetKey } },
    });
    app.bus.emit(id, {
      type: "broadcast.change",
      campaignId: id,
      broadcastKey: widgetKey,
      payload: { active: false, widgetKey },
    });
    reply.code(204).send();
  });
};
