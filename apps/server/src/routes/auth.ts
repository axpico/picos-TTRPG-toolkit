import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { loginInput, registerInput, type AuthMe, type Role } from "@toolkit/shared";
import { prisma } from "../db.js";

async function buildMe(userId: string): Promise<AuthMe> {
  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true },
    }),
    prisma.membership.findMany({ where: { userId }, select: { campaignId: true, role: true } }),
  ]);
  if (!user) return { authenticated: false };
  return {
    authenticated: true,
    user,
    memberships: memberships.map((m) => ({ campaignId: m.campaignId, role: m.role as Role })),
  };
}

// Throttle credential endpoints: 10 attempts per minute per IP.
const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", authRateLimit, async (req, reply) => {
    const body = registerInput.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) {
      reply.code(409).send({ error: { code: "username_taken", message: "Username is taken." } });
      return;
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { username: body.username, passwordHash, displayName: body.displayName ?? null },
    });
    req.session.set("userId", user.id);
    req.session.set("loggedInAt", Date.now());
    reply.code(201);
    return buildMe(user.id);
  });

  app.post("/login", authRateLimit, async (req, reply) => {
    const { username, password } = loginInput.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username } });
    // Always run a compare to blunt username-enumeration timing differences.
    const ok = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv");
    if (!user || !ok) {
      reply.code(401).send({
        error: { code: "invalid_credentials", message: "Wrong username or password." },
      });
      return;
    }
    req.session.set("userId", user.id);
    req.session.set("loggedInAt", Date.now());
    return buildMe(user.id);
  });

  app.post("/logout", async (req) => {
    req.session.delete();
    return { authenticated: false } satisfies AuthMe;
  });

  app.get("/me", async (req) => {
    const userId = req.session.get("userId");
    if (!userId) return { authenticated: false } satisfies AuthMe;
    return buildMe(userId);
  });
};
