import { mkdir, rm, stat } from "node:fs/promises";
import { join, resolve, basename, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import archiver from "archiver";
import { prisma } from "../db.js";
import { env } from "../env.js";

/**
 * Parse the SQLite path out of DATABASE_URL ("file:./data/app.db" → absolute path).
 * Prisma resolves the path relative to the schema directory; the server runs
 * out of apps/server, so use process.cwd() as the base.
 */
function resolveDbPath(): string {
  const raw = env.DATABASE_URL.replace(/^file:/, "");
  return resolve(raw);
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // The export dumps the entire multi-tenant database (every user's data and
  // password hashes) + all uploads, so it must never be reachable by "any DM".
  // Restrict to the single configured server operator; fail closed when unset.
  const requireAdmin = async (req: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => {
    if (!env.ADMIN_USERNAME || req.user?.username !== env.ADMIN_USERNAME) {
      return reply.code(403).send({ error: { code: "forbidden", message: "Admin only." } });
    }
  };

  /**
   * Hot-copy the SQLite database via VACUUM INTO, then stream a zip containing
   * the copy plus the uploads directory. Safe to call while the server is
   * serving traffic — VACUUM INTO holds a read lock briefly but does not block
   * readers.
   */
  app.get("/export", { preHandler: requireAdmin }, async (_req, reply) => {
    const dbPath = resolveDbPath();
    const uploadDir = resolve(env.UPLOAD_DIR);

    const tmpDir = resolve(dirname(dbPath), `.export-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });
    const dbCopy = join(tmpDir, "app.db");

    // VACUUM INTO requires a path literal; escape single quotes defensively.
    const escaped = dbCopy.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${escaped}'`);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    reply.header("Content-Type", "application/zip");
    reply.header(
      "Content-Disposition",
      `attachment; filename="toolkit-export-${stamp}.zip"`,
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("warning", (err) => app.log.warn({ err }, "archive warning"));
    archive.on("error", (err) => {
      app.log.error({ err }, "archive error");
      reply.raw.destroy(err);
    });
    archive.on("end", () => {
      // Best-effort cleanup; ignore failures.
      void rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    });

    archive.file(dbCopy, { name: `db/${basename(dbPath)}` });

    try {
      const s = await stat(uploadDir);
      if (s.isDirectory()) archive.directory(uploadDir, "uploads");
    } catch {
      // No uploads directory — fine, just skip.
    }

    void archive.finalize();
    return reply.send(archive);
  });
};
