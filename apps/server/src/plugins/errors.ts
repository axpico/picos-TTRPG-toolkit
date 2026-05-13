import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      reply.code(400).send({
        error: {
          code: "validation_error",
          message: "Invalid request payload.",
          details: err.flatten(),
        },
      });
      return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        reply.code(404).send({
          error: { code: "not_found", message: "Resource not found." },
        });
        return;
      }
      if (err.code === "P2002") {
        reply.code(409).send({
          error: { code: "conflict", message: "Unique constraint violation." },
        });
        return;
      }
    }
    const e = err as { statusCode?: number; message?: string };
    const status = typeof e.statusCode === "number" ? e.statusCode : 500;
    req.log.error({ err }, "request failed");
    reply.code(status).send({
      error: {
        code: status >= 500 ? "internal_error" : "request_error",
        message: status >= 500 ? "Internal server error." : (e.message ?? "Request failed."),
      },
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      error: { code: "not_found", message: `No route ${req.method} ${req.url}` },
    });
  });
};

export const errorsPlugin = fp(plugin, { name: "errors" });
