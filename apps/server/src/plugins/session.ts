import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import secureSession from "@fastify/secure-session";
import type { Role } from "@toolkit/shared";
import { prisma } from "../db.js";
import { env, isProd } from "../env.js";

/**
 * Resolve the 32-byte session key. Priority:
 *  1. SESSION_KEY env var (base64, must decode to 32 bytes) — use for production.
 *  2. A persisted key file in the data dir — reused across restarts.
 *  3. Otherwise generate one, persist it, and warn.
 * Auto-generating keeps local setup zero-config while still surviving restarts
 * (so you aren't logged out every time the server reboots).
 */
function resolveSessionKey(app: FastifyInstance): Buffer {
  if (env.SESSION_KEY) {
    const buf = Buffer.from(env.SESSION_KEY, "base64");
    if (buf.length !== 32) {
      throw new Error(
        `SESSION_KEY must be 32 bytes when base64-decoded (got ${buf.length}). ` +
          `Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
      );
    }
    return buf;
  }

  // Persist next to the SQLite db / uploads so it's stable across restarts.
  const dataDir = dirname(resolve(env.UPLOAD_DIR));
  const keyPath = resolve(dataDir, "session.key");

  if (existsSync(keyPath)) {
    const buf = Buffer.from(readFileSync(keyPath, "utf8").trim(), "base64");
    if (buf.length === 32) return buf;
    app.log.warn(`Ignoring malformed ${keyPath}; regenerating session key.`);
  }

  const key = randomBytes(32);
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(keyPath, key.toString("base64"), { mode: 0o600 });
  app.log.warn(
    `SESSION_KEY not set — generated one at ${keyPath}. ` +
      `Set SESSION_KEY in .env to control it explicitly (recommended for production).`,
  );
  return key;
}

type SessionUser = { id: string; username: string; displayName: string | null };

declare module "fastify" {
  interface FastifyInstance {
    /** Require a logged-in user; loads `req.user`. */
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Require membership in the route's campaign, optionally with a specific role. */
    requireCampaignRole: (
      role?: Role,
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Require the user to be a DM in at least one campaign (cross-campaign tools). */
    requireAnyDm: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: SessionUser | null;
    membership: { role: Role } | null;
  }
}

declare module "@fastify/secure-session" {
  interface SessionData {
    userId: string;
    loggedInAt: number;
  }
}

function campaignIdOf(req: FastifyRequest): string | undefined {
  const p = req.params as Record<string, string | undefined>;
  return p.id ?? p.campaignId;
}

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const keyBuf = resolveSessionKey(app);

  await app.register(secureSession, {
    key: keyBuf,
    cookieName: "ttrpg_session",
    cookie: {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  });

  app.decorateRequest("user", null);
  app.decorateRequest("membership", null);

  const loadUser = async (req: FastifyRequest): Promise<SessionUser | null> => {
    if (req.user) return req.user;
    const userId = req.session.get("userId");
    if (!userId) return null;
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true },
    });
    req.user = row;
    return row;
  };

  const unauthorized = (reply: FastifyReply) =>
    reply.code(401).send({ error: { code: "unauthorized", message: "Not signed in." } });
  const forbidden = (reply: FastifyReply) =>
    reply.code(403).send({ error: { code: "forbidden", message: "You don't have access to this." } });

  app.decorate("requireAuth", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await loadUser(req);
    if (!user) return unauthorized(reply);
  });

  app.decorate(
    "requireCampaignRole",
    (role?: Role) => async (req: FastifyRequest, reply: FastifyReply) => {
      const user = await loadUser(req);
      if (!user) return unauthorized(reply);
      const campaignId = campaignIdOf(req);
      if (!campaignId) return forbidden(reply);
      const m = await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: user.id, campaignId } },
        select: { role: true },
      });
      if (!m) return forbidden(reply);
      if (role && m.role !== role) return forbidden(reply);
      req.membership = { role: m.role as Role };
    },
  );

  app.decorate("requireAnyDm", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await loadUser(req);
    if (!user) return unauthorized(reply);
    const count = await prisma.membership.count({ where: { userId: user.id, role: "dm" } });
    if (count === 0) return forbidden(reply);
  });
};

export const sessionPlugin = fp(plugin, { name: "session" });
