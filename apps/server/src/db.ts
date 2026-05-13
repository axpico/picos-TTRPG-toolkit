import { PrismaClient } from "@prisma/client";
import { isDev } from "./env.js";

export const prisma = new PrismaClient({
  log: isDev ? ["warn", "error"] : ["error"],
});

let pragmasApplied = false;

/**
 * SQLite default settings will throw SQLITE_BUSY under any real concurrency
 * (e.g. SSE fanout writes while the GM saves layout). WAL + busy_timeout fixes
 * it. Call once at boot, before serving traffic.
 */
export async function applySqlitePragmas(): Promise<void> {
  if (pragmasApplied) return;
  // PRAGMAs that return rows (journal_mode, busy_timeout) must go through
  // $queryRawUnsafe; SQLite refuses to execute row-returning statements via
  // $executeRawUnsafe.
  await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000;");
  await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL;");
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON;");
  pragmasApplied = true;
}
