import { test, mock } from "node:test";
import assert from "node:assert/strict";

// The share projectors turn a GM broadcast payload into a *player-safe* view.
// These tests pin the secret-filtering contract (GM notes/hooks/data never leak)
// and cross-campaign isolation, stubbing only the Prisma singleton.

const D = new Date("2026-06-06T12:00:00Z");
const store: {
  npc: Record<string, unknown> | null;
  monster: Record<string, unknown> | null;
  shop: Record<string, unknown> | null;
  session: Record<string, unknown> | null;
  logs: Record<string, unknown>[];
} = { npc: null, monster: null, shop: null, session: null, logs: [] };

const byId = (row: Record<string, unknown> | null, id: string) =>
  row && row.id === id ? row : null;

const prisma = {
  nPC: { findUnique: async ({ where }: { where: { id: string } }) => byId(store.npc, where.id) },
  monster: { findUnique: async ({ where }: { where: { id: string } }) => byId(store.monster, where.id) },
  shop: { findUnique: async ({ where }: { where: { id: string } }) => byId(store.shop, where.id) },
  session: { findUnique: async ({ where }: { where: { id: string } }) => byId(store.session, where.id) },
  logEntry: { findMany: async () => store.logs },
};

mock.module("../../src/db.js", { namedExports: { prisma } });

const { getProjector } = await import("../../src/share/registry.js");

test("npc projector returns player-safe identity and strips GM secrets", async () => {
  store.npc = {
    id: "n1",
    campaignId: "c1",
    name: "Sera",
    role: "Innkeeper",
    quirk: "Hums old shanties",
    hook: "Secretly a spy",
    notes: "GM-only: works for the duke",
    tagsJson: JSON.stringify(["town"]),
    portraitAssetId: "a1",
    favorite: false,
    locationId: null,
    statsJson: "{}",
    createdAt: D,
    updatedAt: D,
  };
  const data = (await getProjector("npc")!("c1", { npcId: "n1" })) as Record<string, unknown>;
  assert.equal(data.name, "Sera");
  assert.equal(data.role, "Innkeeper");
  assert.deepEqual(data.tags, ["town"]);
  assert.equal("hook" in data, false);
  assert.equal("notes" in data, false);
  assert.equal("stats" in data, false);
});

test("npc projector rejects a different campaign's NPC", async () => {
  store.npc = { id: "n1", campaignId: "other", name: "X", role: null, quirk: null, hook: null, notes: null, tagsJson: "[]", portraitAssetId: null, favorite: false, locationId: null, statsJson: "{}", createdAt: D, updatedAt: D };
  const data = await getProjector("npc")!("c1", { npcId: "n1" });
  assert.equal(data, null);
});

test("npc projector returns null when no id is selected", async () => {
  const data = await getProjector("npc")!("c1", {});
  assert.equal(data, null);
});

test("bestiary projector reveals stats but strips GM notes", async () => {
  store.monster = {
    id: "m1",
    campaignId: "c1",
    name: "Goblin",
    type: "humanoid",
    environment: "cave",
    challenge: "1/4",
    statsJson: "{}",
    notes: "GM-only weakness: fire",
    tagsJson: "[]",
    createdAt: D,
    updatedAt: D,
  };
  const data = (await getProjector("bestiary")!("c1", { monsterId: "m1" })) as Record<string, unknown>;
  assert.equal(data.name, "Goblin");
  assert.ok(data.stats);
  assert.equal("notes" in data, false);
});

test("shop projector shares items but strips GM notes; rejects cross-campaign", async () => {
  store.shop = {
    id: "s1",
    campaignId: "c1",
    name: "General Goods",
    notes: "GM-only: overcharges nobles",
    items: [
      { id: "i1", shopId: "s1", name: "Rope", type: "gear", price: 1, stock: 5, rarity: null, tagsJson: "[]" },
    ],
    createdAt: D,
    updatedAt: D,
  };
  const ok = (await getProjector("shop")!("c1", { shopId: "s1" })) as Record<string, unknown>;
  assert.equal(ok.name, "General Goods");
  assert.equal((ok.items as unknown[]).length, 1);
  assert.equal("notes" in ok, false);

  store.shop = { ...store.shop, campaignId: "other" };
  assert.equal(await getProjector("shop")!("c1", { shopId: "s1" }), null);
});

test("sessions projector shares recap but strips GM prep notes", async () => {
  store.session = {
    id: "se1",
    campaignId: "c1",
    title: "The Heist",
    date: D,
    summary: "They robbed the vault.",
    notes: "GM-only: the vault was a trap",
    externalLinksJson: "[]",
    createdAt: D,
    updatedAt: D,
  };
  const data = (await getProjector("sessions")!("c1", { noteId: "se1" })) as Record<string, unknown>;
  assert.equal(data.title, "The Heist");
  assert.equal(data.summary, "They robbed the vault.");
  assert.equal("notes" in data, false);
});

test("log projector drops GM-internal kinds and the data blob", async () => {
  store.logs = [
    { id: "l1", campaignId: "c1", kind: "note", message: "GM note", dataJson: null, createdAt: D },
    { id: "l2", campaignId: "c1", kind: "broadcast.change", message: "toggled", dataJson: null, createdAt: D },
    { id: "l3", campaignId: "c1", kind: "dice.roll", message: "rolled 20", dataJson: JSON.stringify({ hidden: true }), createdAt: D },
  ];
  const feed = (await getProjector("log")!("c1", {})) as Record<string, unknown>[];
  assert.equal(feed.length, 1);
  assert.equal(feed[0]!.kind, "dice.roll");
  assert.equal("data" in feed[0]!, false);
});

test("sticky projector echoes the payload, but null when empty", async () => {
  const data = (await getProjector("sticky")!("c1", { text: "Beware", color: "#fff" })) as Record<string, unknown>;
  assert.equal(data.text, "Beware");
  assert.equal(data.color, "#fff");
  assert.equal(data.fontSize, "md");
  assert.equal(await getProjector("sticky")!("c1", {}), null);
});

test("unknown widget type has no projector", () => {
  assert.equal(getProjector("does-not-exist"), undefined);
});
