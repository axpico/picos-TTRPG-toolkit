import type { SpellImportStatus } from "@toolkit/shared";
import { prisma } from "../../db.js";
import { isUnofficial, parseSpellDetailPage, parseSpellListPage, type SpellLink } from "./parse.js";

/**
 * Imports the full spell list from dnd5e.wikidot.com into the global library
 * (campaignId null). One job at a time, module-singleton state, polled via
 * GET /api/spells/import/status. Requests run sequentially with a fixed delay
 * to stay polite; upserts keyed on the unique `slug` keep reruns idempotent
 * and never touch custom spells (slug null).
 */

const BASE_URL = "https://dnd5e.wikidot.com";
const REQUEST_DELAY_MS = 300;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1_000;
const USER_AGENT = "picos-TTRPG-toolkit spell importer (self-hosted hobby tool)";

/** Minimal logger surface — satisfied by Fastify's pino logger and console. */
export interface ImportLogger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

export interface ImportOptions {
  log: ImportLogger;
  includeUnofficial?: boolean;
}

let state: SpellImportStatus = {
  status: "idle",
  total: 0,
  done: 0,
  failed: [],
  startedAt: null,
  finishedAt: null,
  error: null,
};

export function getImportState(): SpellImportStatus {
  return { ...state, failed: [...state.failed] };
}

/** Kick off an import in the background. Returns false when one is running. */
export function startImport(opts: ImportOptions): boolean {
  if (state.status === "running") return false;
  state = {
    status: "running",
    total: 0,
    done: 0,
    failed: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };
  void runJob(opts);
  return true;
}

/** Run the import to completion (awaitable variant for the CLI script). */
export async function runImport(opts: ImportOptions): Promise<SpellImportStatus> {
  if (!startImport(opts)) return getImportState();
  while (state.status === "running") await sleep(500);
  return getImportState();
}

async function runJob({ log, includeUnofficial = false }: ImportOptions): Promise<void> {
  try {
    const listHtml = await fetchPage(`${BASE_URL}/spells`);
    let links = parseSpellListPage(listHtml);
    if (!includeUnofficial) links = links.filter((l) => !isUnofficial(l.name));
    state.total = links.length;
    log.info({ total: links.length }, "spell import started");

    for (const link of links) {
      try {
        await sleep(REQUEST_DELAY_MS);
        await importOne(link);
      } catch (err: unknown) {
        state.failed.push(link.slug);
        log.warn({ err, slug: link.slug }, "spell import: page failed");
      } finally {
        state.done += 1;
      }
    }

    state.status = "done";
    state.finishedAt = new Date().toISOString();
    log.info({ done: state.done, failed: state.failed.length }, "spell import finished");
  } catch (err: unknown) {
    state.status = "error";
    state.error = err instanceof Error ? err.message : "Unexpected import error";
    state.finishedAt = new Date().toISOString();
    log.error({ err }, "spell import aborted");
  }
}

async function importOne(link: SpellLink): Promise<void> {
  const html = await fetchPage(`${BASE_URL}/spell:${link.slug}`);
  const parsed = parseSpellDetailPage(html, link);
  const data = {
    name: parsed.name,
    level: parsed.level,
    school: parsed.school,
    castingTime: parsed.castingTime,
    range: parsed.range,
    components: parsed.components,
    duration: parsed.duration,
    description: parsed.description,
    higherLevels: parsed.higherLevels,
    classesJson: JSON.stringify(parsed.classes),
    ritual: parsed.ritual,
    concentration: parsed.concentration,
    source: parsed.source ?? "dnd5e.wikidot.com",
  };
  await prisma.spell.upsert({
    where: { slug: link.slug },
    create: { ...data, slug: link.slug, campaignId: null },
    update: data,
  });
}

async function fetchPage(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff(attempt));
        lastError = new Error(`429 Too Many Requests for ${url}`);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err: unknown) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) await sleep(backoff(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

function backoff(attempt: number): number {
  return RETRY_BASE_DELAY_MS * 3 ** (attempt - 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
