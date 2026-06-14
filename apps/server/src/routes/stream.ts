import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { SSEEvent } from "@toolkit/shared";
import { openSse } from "../plugins/sse.js";

const params = z.object({ campaignId: z.string().min(1) });

export const streamRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:campaignId", { preHandler: app.requireCampaignRole("dm") }, async (req, reply) => {
    const { campaignId } = params.parse(req.params);
    openSse(reply);

    let closed = false;
    let unsubscribe = () => {};
    const closeStream = () => {
      if (closed) return;
      closed = true;
      unsubscribe();
      try {
        reply.raw.end();
      } catch {
        /* connection already gone */
      }
    };

    unsubscribe = app.bus.subscribe(campaignId, reply, (event: SSEEvent) => {
      // Tear down if this DM loses DM access in the campaign (demoted or removed).
      if (event.type === "membership.change") {
        const p = event.payload as { userId?: string; role?: string | null } | undefined;
        if (p?.userId === req.user!.id && p.role !== "dm") closeStream();
      }
      return true;
    });
    req.raw.on("close", closeStream);
    req.raw.on("error", closeStream);
    // Signal Fastify we're hijacking the response.
    return reply;
  });
};
