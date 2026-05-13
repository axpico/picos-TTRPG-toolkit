import { EventEmitter } from "node:events";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type { SSEEvent } from "@toolkit/shared";

declare module "fastify" {
  interface FastifyInstance {
    bus: SseBus;
  }
}

export interface SseBus {
  emit(campaignId: string, event: SSEEvent): void;
  subscribe(
    campaignId: string,
    reply: FastifyReply,
    filter?: (e: SSEEvent) => boolean,
  ): () => void;
}

const HEARTBEAT_MS = 15_000;

function writeEvent(reply: FastifyReply, event: SSEEvent) {
  reply.raw.write(`event: ${event.type}\n`);
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

const plugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const emitter = new EventEmitter();
  // Many simultaneous SSE listeners are normal; suppress Node's default cap.
  emitter.setMaxListeners(0);

  const bus: SseBus = {
    emit(campaignId, event) {
      emitter.emit(`campaign:${campaignId}`, event);
    },
    subscribe(campaignId, reply, filter) {
      const channel = `campaign:${campaignId}`;
      const listener = (event: SSEEvent) => {
        if (filter && !filter(event)) return;
        try {
          writeEvent(reply, event);
        } catch (err) {
          app.log.warn({ err, campaignId }, "sse write failed");
        }
      };
      emitter.on(channel, listener);
      const heartbeat = setInterval(() => {
        try {
          reply.raw.write(`: heartbeat ${Date.now()}\n\n`);
        } catch {
          /* swallow; cleanup runs on close */
        }
      }, HEARTBEAT_MS);
      return () => {
        clearInterval(heartbeat);
        emitter.off(channel, listener);
      };
    },
  };

  app.decorate("bus", bus);
};

export const ssePlugin = fp(plugin, { name: "sse" });

/**
 * Initialize an SSE response. Writes the headers, sends a hello event, and
 * returns a function to wire a per-connection cleanup.
 */
export function openSse(reply: FastifyReply) {
  reply.raw.statusCode = 200;
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader("X-Accel-Buffering", "no");
  reply.raw.flushHeaders?.();
  reply.raw.write(`: connected ${Date.now()}\n\n`);
}
