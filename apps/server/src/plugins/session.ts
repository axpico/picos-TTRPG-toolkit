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
    /**
     * Per-row authorization for shared-library routes (spells/npcs/monsters):
     * a `null`/`undefined` campaignId is the shared global library (allowed for
     * any DM); a campaign-scoped row requires the caller to be that campaign's DM.
     * Returns `true` when allowed; on failure sends the 401/403 reply and returns
     * `false` so the caller can early-return.
     */
    assertCampaignDm: (
      req: FastifyRequest,
      reply: FastifyReply,
      campaignId: string | null | undefined,
    ) => Promise<boolean>;
    /**
     * Require the caller to be a member (any role) of the given campaign. A
     * `null`/`undefined` campaignId means "not campaign-scoped" → allowed for any
     * authenticated user. Returns `true` when allowed; otherwise replies and `false`.
     */
    assertCampaignMember: (
      req: FastifyRequest,
      reply: FastifyReply,
      campaignId: string | null | undefined,
    ) => Promise<boolean>;
    /** Resolve the logged-in user's id (loads `req.user` if needed). */
    getUserId: (req: FastifyRequest) => Promise<string | null>;
    /**
     * Read authorization for a library row. Campaign rows require DM membership;
     * a `null`-owner row is the shared read-only seed (readable by any DM); an
     * owned library row is readable only by its owner.
     */
    assertCanReadRow: (
      req: FastifyRequest,
      reply: FastifyReply,
      row: { campaignId: string | null; ownerUserId: string | null },
    ) => Promise<boolean>;
    /**
     * Write authorization for a library row. Campaign rows require DM membership;
     * library rows are writable only by their owner. Seed rows (`null` owner) and
     * other users' rows are not writable.
     */
    assertCanWriteRow: (
      req: FastifyRequest,
      reply: FastifyReply,
      row: { campaignId: string | null; ownerUserId: string | null },
    ) => Promise<boolean>;
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

  const isDmOf = async (userId: string, campaignId: string): Promise<boolean> => {
    const m = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId, campaignId } },
      select: { role: true },
    });
    return !!m && m.role === "dm";
  };

  app.decorate(
    "assertCampaignDm",
    async (req: FastifyRequest, reply: FastifyReply, campaignId: string | null | undefined) => {
      if (!campaignId) return true; // library scope — ownership is enforced per-row
      const user = await loadUser(req);
      if (!user) {
        unauthorized(reply);
        return false;
      }
      if (!(await isDmOf(user.id, campaignId))) {
        forbidden(reply);
        return false;
      }
      return true;
    },
  );

  app.decorate("getUserId", async (req: FastifyRequest) => {
    const user = await loadUser(req);
    return user?.id ?? null;
  });

  app.decorate(
    "assertCampaignMember",
    async (req: FastifyRequest, reply: FastifyReply, campaignId: string | null | undefined) => {
      const user = await loadUser(req);
      if (!user) {
        unauthorized(reply);
        return false;
      }
      if (!campaignId) return true; // not campaign-scoped — any authed user
      const m = await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: user.id, campaignId } },
        select: { role: true },
      });
      if (!m) {
        forbidden(reply);
        return false;
      }
      return true;
    },
  );

  app.decorate(
    "assertCanReadRow",
    async (
      req: FastifyRequest,
      reply: FastifyReply,
      row: { campaignId: string | null; ownerUserId: string | null },
    ) => {
      const user = await loadUser(req);
      if (!user) {
        unauthorized(reply);
        return false;
      }
      if (row.campaignId) {
        if (!(await isDmOf(user.id, row.campaignId))) {
          forbidden(reply);
          return false;
        }
        return true;
      }
      // Library row: shared seed (null owner) is readable; otherwise owner-only.
      if (row.ownerUserId === null || row.ownerUserId === user.id) return true;
      forbidden(reply);
      return false;
    },
  );

  app.decorate(
    "assertCanWriteRow",
    async (
      req: FastifyRequest,
      reply: FastifyReply,
      row: { campaignId: string | null; ownerUserId: string | null },
    ) => {
      const user = await loadUser(req);
      if (!user) {
        unauthorized(reply);
        return false;
      }
      if (row.campaignId) {
        if (!(await isDmOf(user.id, row.campaignId))) {
          forbidden(reply);
          return false;
        }
        return true;
      }
      // Library row: only the owner may write. Seed (null) is read-only.
      if (row.ownerUserId === user.id) return true;
      forbidden(reply);
      return false;
    },
  );
};

export const sessionPlugin = fp(plugin, { name: "session" });
