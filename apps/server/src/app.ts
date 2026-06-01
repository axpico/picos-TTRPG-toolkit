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
import { stickyRoutes } from "./routes/sticky.js";
import { clockRoutes } from "./routes/clock.js";
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

  // Public auth endpoints.
  await app.register(authRoutes, { prefix: "/api/auth" });

  // Player-facing read-only endpoints (gated by share token, not session).
  await app.register(playerRoutes, { prefix: "/api/player" });

  // Asset retrieval is intentionally public — IDs are UUIDs and the player view
  // needs to load maps/portraits without a session cookie.
  await app.register(fileReadRoutes, { prefix: "/api/files" });

  // GM endpoints (everything else requires session).
  await app.register(async (gm) => {
    gm.addHook("preHandler", gm.requireGm);
    await gm.register(campaignRoutes, { prefix: "/api/campaigns" });
    await gm.register(layoutRoutes, { prefix: "/api/campaigns" });
    await gm.register(broadcastRoutes, { prefix: "/api/campaigns" });
    await gm.register(partyRoutes, { prefix: "/api/campaigns" });
    await gm.register(combatRoutes, { prefix: "/api/campaigns" });
    await gm.register(npcRoutes, { prefix: "/api/npcs" });
    await gm.register(monsterRoutes, { prefix: "/api/monsters" });
    await gm.register(sessionRoutes, { prefix: "/api/campaigns" });
    await gm.register(shopRoutes, { prefix: "/api/campaigns" });
    await gm.register(diceRoutes, { prefix: "/api/campaigns" });
    await gm.register(weatherRoutes, { prefix: "/api/campaigns" });
    await gm.register(calendarRoutes, { prefix: "/api/campaigns" });
    await gm.register(logRoutes, { prefix: "/api/campaigns" });
    await gm.register(locationRoutes, { prefix: "/api/campaigns" });
    await gm.register(stickyRoutes, { prefix: "/api/campaigns" });
    await gm.register(clockRoutes, { prefix: "/api/campaigns" });
    await gm.register(rollTableRoutes, { prefix: "/api/campaigns" });
    await gm.register(streamRoutes, { prefix: "/api/stream" });
    await gm.register(fileUploadRoutes, { prefix: "/api/uploads" });
    await gm.register(adminRoutes, { prefix: "/api/admin" });
  });

  app.get("/api/health", async () => ({ ok: true, env: env.NODE_ENV }));

  return app;
}
