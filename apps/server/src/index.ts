import net from "node:net";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildApp } from "./app.js";
import { applySqlitePragmas, prisma } from "./db.js";
import { env, isDev } from "./env.js";

/** Resolve true if nothing is currently listening on `port` at `host`. */
function isPortFree(port: number, host: string): Promise<boolean> {
  return new Promise((res) => {
    const srv = net.createServer();
    srv.once("error", () => res(false));
    srv.once("listening", () => srv.close(() => res(true)));
    srv.listen(port, host);
  });
}

/** First free port at or after `start` (scans up to `tries` ports). */
async function findFreePort(start: number, host: string, tries = 20): Promise<number> {
  for (let p = start; p < start + tries; p++) {
    if (await isPortFree(p, host)) return p;
  }
  throw new Error(`No free port found in range ${start}–${start + tries - 1}`);
}

async function main() {
  await applySqlitePragmas();
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    try {
      await app.close();
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  const host = "127.0.0.1";
  const port = await findFreePort(env.PORT, host);
  if (port !== env.PORT) {
    app.log.warn(`Port ${env.PORT} in use — falling back to ${port}.`);
  }
  await app.listen({ port, host });

  // In dev, publish the chosen port so the Vite proxy can follow if it moved.
  if (isDev) {
    try {
      writeFileSync(resolve(process.cwd(), "../../.dev-server-port"), String(port));
    } catch {
      /* best-effort; proxy falls back to the configured PORT */
    }
  }
}

main().catch((err) => {
  console.error("[server] fatal:", err);
  process.exit(1);
});
