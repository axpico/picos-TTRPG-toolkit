import Fastify, { type FastifyInstance } from "fastify";
import { env, isDev } from "./env.js";
import { errorsPlugin } from "./plugins/errors.js";
import { sessionPlugin } from "./plugins/session.js";
import { ssePlugin } from "./plugins/sse.js";
import { authRoutes } from "./routes/auth.js";
import { campaignRoutes } from "./routes/campaigns.js";
import { layoutRoutes } from "./routes/layout.js";
import { broadcastRoutes } from "./routes/broadcast.js";
import { partyRoutes } from "./routes/party.js";
import { combatRoutes } from "./routes/combat.js";
import { npcRoutes } from "./routes/npc.js";
import { monsterRoutes } from "./routes/monster.js";
import { sessionRoutes } from "./routes/session.js";
import { shopRoutes } from "./routes/shop.js";
import { diceRoutes } from "./routes/dice.js";
import { weatherRoutes } from "./routes/weather.js";
import { calendarRoutes } from "./routes/calendar.js";
import { logRoutes } from "./routes/log.js";
import { streamRoutes } from "./routes/stream.js";
import { playerRoutes } from "./routes/player.js";
import { fileReadRoutes, fileUploadRoutes } from "./routes/files.js";
import { adminRoutes } from "./routes/admin.js";
import { locationRoutes } from "./routes/location.js";
import { clockRoutes } from "./routes/clock.js";
import { timerRoutes } from "./routes/timer.js";
import { rollTableRoutes } from "./routes/rolltable.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: isDev
      ? { transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } } }
      : true,
    // Keep SSE connections alive for a long time.
    keepAliveTimeout: 120_000,
    connectionTimeout: 0,
    disableRequestLogging: false,
  });

  await app.register(errorsPlugin);
  await app.register(sessionPlugin);
  await app.register(ssePlugin);

  // Public endpoints: auth (register/login/logout/me) + asset reads (UUID-addressed).
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(fileReadRoutes, { prefix: "/api/files" });

  // Everything else requires a logged-in user.
  await app.register(async (authed) => {
    authed.addHook("preHandler", authed.requireAuth);

    // Self-managed authorization (per-route guards inside the plugin):
    //  - campaigns: list/create/join are user-scoped; :id routes guard by role.
    //  - player/dice: member-gated (any role). stream: DM-gated.
    await authed.register(campaignRoutes, { prefix: "/api/campaigns" });
    await authed.register(playerRoutes, { prefix: "/api/campaigns" });
    await authed.register(diceRoutes, { prefix: "/api/campaigns" });
    await authed.register(streamRoutes, { prefix: "/api/stream" });

    // DM-only, campaign-scoped editing tools (gated for the whole group).
    await authed.register(async (dm) => {
      dm.addHook("preHandler", dm.requireCampaignRole("dm"));
      await dm.register(layoutRoutes, { prefix: "/api/campaigns" });
      await dm.register(broadcastRoutes, { prefix: "/api/campaigns" });
      await dm.register(partyRoutes, { prefix: "/api/campaigns" });
      await dm.register(combatRoutes, { prefix: "/api/campaigns" });
      await dm.register(sessionRoutes, { prefix: "/api/campaigns" });
      await dm.register(shopRoutes, { prefix: "/api/campaigns" });
      await dm.register(weatherRoutes, { prefix: "/api/campaigns" });
      await dm.register(calendarRoutes, { prefix: "/api/campaigns" });
      await dm.register(logRoutes, { prefix: "/api/campaigns" });
      await dm.register(locationRoutes, { prefix: "/api/campaigns" });
      await dm.register(clockRoutes, { prefix: "/api/campaigns" });
      await dm.register(timerRoutes, { prefix: "/api/campaigns" });
      await dm.register(rollTableRoutes, { prefix: "/api/campaigns" });
    });

    // Cross-campaign DM tools (require a DM membership somewhere).
    await authed.register(async (dmAny) => {
      dmAny.addHook("preHandler", dmAny.requireAnyDm);
      await dmAny.register(npcRoutes, { prefix: "/api/npcs" });
      await dmAny.register(monsterRoutes, { prefix: "/api/monsters" });
      await dmAny.register(fileUploadRoutes, { prefix: "/api/uploads" });
      await dmAny.register(adminRoutes, { prefix: "/api/admin" });
    });
  });

  app.get("/api/health", async () => ({ ok: true, env: env.NODE_ENV }));

  return app;
}
