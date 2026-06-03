import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { toLogDto } from "../lib/repos/log.js";

const params = z.object({ id: z.string().min(1) });
const query = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  before: z.string().datetime().optional(),
});

export const logRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/log", async (req) => {
    const { id } = params.parse(req.params);
    const { limit, before } = query.parse(req.query);
    const rows = await prisma.logEntry.findMany({
      where: {
        campaignId: id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toLogDto);
  });

  const exportQuery = z.object({ kind: z.string().min(1).optional() });
  app.get("/:id/log/export", async (req, reply) => {
    const { id } = params.parse(req.params);
    const { kind } = exportQuery.parse(req.query);
    const rows = await prisma.logEntry.findMany({
      where: { campaignId: id, ...(kind ? { kind } : {}) },
      orderBy: { createdAt: "asc" },
    });
    const md = rows
      .map((r) => `- **${r.createdAt.toISOString()}** \`${r.kind}\` — ${r.message}`)
      .join("\n");
    reply.header("Content-Type", "text/markdown; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="campaign-${id}-log.md"`);
    return `# Campaign log\n\n${md}\n`;
  });
};
