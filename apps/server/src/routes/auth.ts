import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { loginInput } from "@toolkit/shared";
import { prisma } from "../db.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (req, reply) => {
    const { password } = loginInput.parse(req.body);
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      reply.code(503).send({
        error: {
          code: "not_initialized",
          message: "Server has not been seeded. Run `npm run seed`.",
        },
      });
      return;
    }
    const ok = await bcrypt.compare(password, settings.passwordHash);
    if (!ok) {
      reply.code(401).send({
        error: { code: "invalid_credentials", message: "Wrong password." },
      });
      return;
    }
    req.session.set("gm", true);
    req.session.set("loggedInAt", Date.now());
    return { authenticated: true };
  });

  app.post("/logout", async (req) => {
    req.session.delete();
    return { authenticated: false };
  });

  app.get("/me", async (req) => {
    return { authenticated: Boolean(req.session.get("gm")) };
  });
};
