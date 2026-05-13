import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { openSse } from "../plugins/sse.js";

const params = z.object({ campaignId: z.string().min(1) });

export const streamRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:campaignId", async (req, reply) => {
    const { campaignId } = params.parse(req.params);
    openSse(reply);
    const unsubscribe = app.bus.subscribe(campaignId, reply);
    req.raw.on("close", unsubscribe);
    req.raw.on("error", unsubscribe);
    // Signal Fastify we're hijacking the response.
    return reply;
  });
};
