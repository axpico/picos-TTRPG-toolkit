import { createReadStream } from "node:fs";
import { stat, mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import { z } from "zod";
import { ALLOWED_IMAGE_MIME, MAX_UPLOAD_BYTES } from "@toolkit/shared";
import { prisma } from "../db.js";
import { env } from "../env.js";

const idParams = z.object({ id: z.string().min(1) });

function extFor(mime: string): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".bin";
  }
}

/** GM-only upload endpoints. Register under a session-protected scope. */
export const fileUploadRoutes: FastifyPluginAsync = async (app) => {
  await app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  });

  const uploadDir = resolve(env.UPLOAD_DIR);
  await mkdir(uploadDir, { recursive: true });

  app.post("/upload", async (req, reply) => {
    const file = await req.file();
    if (!file) {
      reply.code(400).send({ error: { code: "no_file", message: "No file uploaded." } });
      return;
    }
    const mime = file.mimetype;
    if (!ALLOWED_IMAGE_MIME.includes(mime as (typeof ALLOWED_IMAGE_MIME)[number])) {
      reply.code(415).send({
        error: { code: "unsupported_media", message: `Mime ${mime} not allowed.` },
      });
      return;
    }
    const id = randomUUID();
    const ext = extFor(mime);
    const onDisk = `${id}${ext}`;
    const fullPath = join(uploadDir, onDisk);
    const buf = await file.toBuffer();
    if (buf.byteLength > MAX_UPLOAD_BYTES) {
      reply
        .code(413)
        .send({ error: { code: "file_too_large", message: "File too large." } });
      return;
    }
    await writeFile(fullPath, buf);
    const row = await prisma.asset.create({
      data: {
        id,
        filename: onDisk,
        mime,
        size: buf.byteLength,
      },
    });
    reply.code(201);
    return {
      id: row.id,
      filename: file.filename,
      mime: row.mime,
      size: row.size,
      url: `/api/files/${row.id}`,
      createdAt: row.createdAt.toISOString(),
    };
  });
};

/**
 * Public retrieval. Asset IDs are UUIDs (high entropy) and serving them
 * publicly lets the player view render maps/portraits without a session cookie.
 */
export const fileReadRoutes: FastifyPluginAsync = async (app) => {
  const uploadDir = resolve(env.UPLOAD_DIR);

  app.get("/:id", async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const row = await prisma.asset.findUnique({ where: { id } });
    if (!row) {
      reply.code(404).send({ error: { code: "not_found", message: "Asset not found." } });
      return;
    }
    const fullPath = join(uploadDir, row.filename);
    try {
      const s = await stat(fullPath);
      reply.header("Content-Type", row.mime);
      reply.header("Content-Length", s.size);
      reply.header("Content-Disposition", `inline; filename="asset${extname(row.filename)}"`);
      reply.header("Cache-Control", "private, max-age=31536000, immutable");
      return reply.send(createReadStream(fullPath));
    } catch {
      reply.code(404).send({ error: { code: "not_found", message: "Asset file missing." } });
      return;
    }
  });
};
