import { prisma } from "../db.js";
import { toNpcDto } from "../lib/repos/npc.js";
import { toMonsterDto } from "../lib/repos/monster.js";
import { toShopDto } from "../lib/repos/shop.js";
import { toSessionDto } from "../lib/repos/session.js";
import { toLogDto } from "../lib/repos/log.js";

/**
 * Share-engine projectors. Each projector turns a campaign + the GM's broadcast
 * payload into a **player-safe** projection for the player view. They run inside
 * the member-gated `player-state` endpoint, deliberately bypassing the DM-only
 * route guards — secrets are stripped here, not by access control.
 *
 * Returning `null` means "nothing to show" (no item selected / row missing), and
 * the entry is omitted from the player projection.
 */
export type ShareProjector = (
  campaignId: string,
  payload: Record<string, unknown>,
) => Promise<unknown | null>;

const projectors = new Map<string, ShareProjector>();

export function registerProjector(type: string, fn: ShareProjector): void {
  projectors.set(type, fn);
}

export function getProjector(type: string): ShareProjector | undefined {
  return projectors.get(type);
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

// --- NPC Library — spotlight a single NPC the GM is introducing -------------
registerProjector("npc", async (campaignId, payload) => {
  const npcId = str(payload.npcId);
  if (!npcId) return null;
  const row = await prisma.nPC.findUnique({ where: { id: npcId } });
  if (!row) return null;
  // Library NPCs may be global (campaignId null). Never leak another campaign's.
  if (row.campaignId && row.campaignId !== campaignId) return null;
  const dto = toNpcDto(row);
  // Player-safe: identity + observable flavor only. Strip GM notes, hooks, stats.
  return {
    id: dto.id,
    name: dto.name,
    role: dto.role,
    quirk: dto.quirk,
    tags: dto.tags,
    portraitAssetId: dto.portraitAssetId,
  };
});

// --- Bestiary — reveal a single creature's stat block -----------------------
registerProjector("bestiary", async (campaignId, payload) => {
  const monsterId = str(payload.monsterId);
  if (!monsterId) return null;
  const row = await prisma.monster.findUnique({ where: { id: monsterId } });
  if (!row) return null;
  if (row.campaignId && row.campaignId !== campaignId) return null;
  const dto = toMonsterDto(row);
  // Player-safe: the stat block is the point of a reveal; GM notes are not.
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    environment: dto.environment,
    challenge: dto.challenge,
    tags: dto.tags,
    stats: dto.stats,
  };
});

// --- Shops — share a shop's visible inventory -------------------------------
registerProjector("shop", async (campaignId, payload) => {
  const shopId = str(payload.shopId);
  if (!shopId) return null;
  const row = await prisma.shop.findUnique({ where: { id: shopId }, include: { items: true } });
  if (!row || row.campaignId !== campaignId) return null;
  const dto = toShopDto(row);
  // Player-safe: items + name only. Strip the GM's private shop notes.
  return {
    id: dto.id,
    name: dto.name,
    items: dto.items,
  };
});

// --- Sessions / Notes — share a single recap/handout ------------------------
registerProjector("sessions", async (campaignId, payload) => {
  const noteId = str(payload.noteId);
  if (!noteId) return null;
  const row = await prisma.session.findUnique({ where: { id: noteId } });
  if (!row || row.campaignId !== campaignId) return null;
  const dto = toSessionDto(row);
  // Player-safe: the recap + external handouts. Strip the GM's prep `notes`.
  return {
    id: dto.id,
    title: dto.title,
    date: dto.date,
    summary: dto.summary,
    externalLinks: dto.externalLinks,
  };
});

// --- Session Log — a live feed of recent player-relevant events --------------
const LOG_HIDDEN_KINDS = new Set(["broadcast.change", "note"]);
registerProjector("log", async (campaignId) => {
  const rows = await prisma.logEntry.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  // Player-safe: message + kind only. Drop the `data` blob (carries hidden-roll
  // flags etc.) and GM-internal kinds.
  return rows
    .map(toLogDto)
    .filter((e) => !LOG_HIDDEN_KINDS.has(e.kind))
    .slice(0, 25)
    .map((e) => ({ id: e.id, kind: e.kind, message: e.message, createdAt: e.createdAt }));
});

// --- Sticky Notes — client-state widget; the payload *is* the note ----------
registerProjector("sticky", async (_campaignId, payload) => {
  const text = str(payload.text);
  const title = str(payload.title);
  if (!text && !title) return null;
  return {
    text: text ?? "",
    title: title ?? null,
    color: str(payload.color) ?? null,
    fontSize: str(payload.fontSize) ?? "md",
  };
});
