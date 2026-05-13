import { buildApp } from "./app.js";
import { applySqlitePragmas, prisma } from "./db.js";
import { env } from "./env.js";

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

  await app.listen({ port: env.PORT, host: "127.0.0.1" });
}

main().catch((err) => {
  console.error("[server] fatal:", err);
  process.exit(1);
});
