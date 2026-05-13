import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import secureSession from "@fastify/secure-session";
import { env, isProd } from "../env.js";

declare module "fastify" {
  interface FastifyInstance {
    requireGm: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/secure-session" {
  interface SessionData {
    gm: boolean;
    loggedInAt: number;
  }
}

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  // SESSION_KEY must decode to exactly 32 bytes (base64).
  const keyBuf = Buffer.from(env.SESSION_KEY, "base64");
  if (keyBuf.length !== 32) {
    throw new Error(
      `SESSION_KEY must be 32 bytes when base64-decoded (got ${keyBuf.length}). ` +
        `Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }

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

  app.decorate("requireGm", async (req: FastifyRequest, reply: FastifyReply) => {
    const gm = req.session.get("gm");
    if (!gm) {
      reply.code(401).send({
        error: { code: "unauthorized", message: "Not signed in." },
      });
    }
  });
};

export const sessionPlugin = fp(plugin, { name: "session" });
