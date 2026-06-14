import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { SseBus } from "../../src/plugins/sse.js";

// CRUD + purchase coverage for /api/campaigns/:id/shops, with the Prisma
// singleton stubbed by an in-memory store (no DB). resolvePurchase and
// generateShop are exercised for real. Shop routes don't call the session/DM
// decorators (campaign gating lives at registration in app.ts), so the harness
// only needs a bus.

type Row = Record<string, any>;
const store: { shops: Row[]; items: Row[]; members: Row[]; logs: Row[] } = {
  shops: [],
  items: [],
  members: [],
  logs: [],
};
const emitted: Row[] = [];
let nextId = 1;
const gen = (p: string) => `${p}${nextId++}`;

const itemsFor = (shopId: string) => store.items.filter((i) => i.shopId === shopId);
const withItems = (shop: Row) => ({ ...shop, items: itemsFor(shop.id) });

const seedShop = (over: Row = {}): Row => {
  const shop: Row = {
    id: gen("sh"),
    campaignId: "c1",
    name: "General Store",
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
  };
  store.shops.push(shop);
  return shop;
};

const seedItem = (over: Row = {}): Row => {
  const item: Row = {
    id: gen("it"),
    shopId: "sh1",
    name: "Torch",
    type: null,
    price: 10,
    stock: 5,
    rarity: null,
    tagsJson: "[]",
    ...over,
  };
  store.items.push(item);
  return item;
};

const seedMember = (over: Row = {}): Row => {
  const member: Row = {
    id: gen("pm"),
    campaignId: "c1",
    userId: null,
    name: "Aria",
    playerName: "Sam",
    hp: 10,
    hpMax: 12,
    gold: 100,
    status: "active",
    conditionsJson: "[]",
    notes: null,
    portraitAssetId: null,
    statsJson: "{}",
    order: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
  };
  store.members.push(member);
  return member;
};

const shopCampaignId = (shopId: string) => store.shops.find((s) => s.id === shopId)?.campaignId;

const prisma = {
  shop: {
    findMany: async ({ where }: Row) =>
      store.shops.filter((s) => s.campaignId === where.campaignId).map(withItems),
    create: async ({ data }: Row) => {
      const shop = seedShop({ campaignId: data.campaignId, name: data.name, notes: data.notes ?? null });
      if (data.items?.create) {
        for (const i of data.items.create) store.items.push({ id: gen("it"), shopId: shop.id, ...i });
      }
      return withItems(shop);
    },
    findFirst: async ({ where, include }: Row) => {
      const shop = store.shops.find((s) => s.id === where.id && s.campaignId === where.campaignId);
      if (!shop) return null;
      return include ? withItems(shop) : shop;
    },
    update: async ({ where, data }: Row) => {
      const shop = store.shops.find((s) => s.id === where.id)!;
      Object.assign(shop, data);
      return withItems(shop);
    },
    delete: async ({ where }: Row) => {
      const idx = store.shops.findIndex((s) => s.id === where.id);
      return store.shops.splice(idx, 1)[0];
    },
  },
  shopItem: {
    create: async ({ data }: Row) => {
      const item = { id: gen("it"), ...data };
      store.items.push(item);
      return item;
    },
    findFirst: async ({ where }: Row) => {
      const item = store.items.find((i) => i.id === where.id && i.shopId === where.shopId);
      if (!item) return null;
      if (where.shop && shopCampaignId(item.shopId) !== where.shop.campaignId) return null;
      return item;
    },
    update: async ({ where, data }: Row) => {
      const item = store.items.find((i) => i.id === where.id)!;
      Object.assign(item, data);
      return item;
    },
    delete: async ({ where }: Row) => {
      const idx = store.items.findIndex((i) => i.id === where.id);
      return store.items.splice(idx, 1)[0];
    },
  },
  partyMember: {
    findUnique: async ({ where }: Row) => store.members.find((m) => m.id === where.id) ?? null,
  },
  logEntry: {
    create: async ({ data }: Row) => {
      store.logs.push(data);
      return { id: gen("log"), createdAt: new Date("2026-01-01T00:00:00.000Z"), ...data };
    },
  },
  // Interactive transaction: run the callback against a tx that mutates the
  // same store and honours the guarded updateMany WHERE clauses.
  $transaction: async (fn: (tx: Row) => Promise<unknown>) => {
    const tx = {
      shopItem: {
        updateMany: async ({ where, data }: Row) => {
          const item = store.items.find((i) => i.id === where.id);
          if (!item || (where.stock?.gte != null && item.stock < where.stock.gte)) return { count: 0 };
          if (data.stock?.decrement != null) item.stock -= data.stock.decrement;
          return { count: 1 };
        },
        findUniqueOrThrow: async ({ where }: Row) => {
          const item = store.items.find((i) => i.id === where.id);
          if (!item) throw new Error("item gone");
          return item;
        },
      },
      partyMember: {
        updateMany: async ({ where, data }: Row) => {
          const m = store.members.find((x) => x.id === where.id);
          if (!m || (where.gold?.gte != null && m.gold < where.gold.gte)) return { count: 0 };
          if (data.gold?.decrement != null) m.gold -= data.gold.decrement;
          return { count: 1 };
        },
        findUniqueOrThrow: async ({ where }: Row) => {
          const m = store.members.find((x) => x.id === where.id);
          if (!m) throw new Error("member gone");
          return m;
        },
      },
    };
    return fn(tx);
  },
};

mock.module("../../src/db.js", { exports: { prisma } });

const { shopRoutes } = await import("../../src/routes/shop.js");
const Fastify = (await import("fastify")).default;

async function buildApp() {
  const app = Fastify();
  const bus: SseBus = {
    emit: (campaignId, event) => {
      emitted.push({ ...event, campaignId });
    },
    subscribe: () => () => {},
    presence: () => 0,
    trackPresence: () => () => {},
  };
  app.decorate("bus", bus);
  await app.register(shopRoutes, { prefix: "/api/campaigns" });
  return app;
}

beforeEach(() => {
  store.shops = [];
  store.items = [];
  store.members = [];
  store.logs = [];
  emitted.length = 0;
  nextId = 1;
});

// --- shop CRUD ---

test("POST /:id/shops creates a shop, logs it, returns 201", async () => {
  const app = await buildApp();
  const res = await app.inject({ method: "POST", url: "/api/campaigns/c1/shops", payload: { name: "Forge" } });
  assert.equal(res.statusCode, 201);
  assert.equal(res.json().name, "Forge");
  assert.equal(store.shops.length, 1);
  assert.equal(store.logs.at(-1)?.kind, "shop.create");
});

test("GET /:id/shops lists shops for the campaign with items", async () => {
  seedShop({ id: "sh1" });
  seedItem({ shopId: "sh1" });
  const app = await buildApp();
  const res = await app.inject({ method: "GET", url: "/api/campaigns/c1/shops" });
  assert.equal(res.statusCode, 200);
  const body = res.json() as Row[];
  assert.equal(body.length, 1);
  assert.equal(body[0]?.items.length, 1);
});

test("GET /:id/shops/:shopId returns 404 for a missing shop", async () => {
  const app = await buildApp();
  const res = await app.inject({ method: "GET", url: "/api/campaigns/c1/shops/nope" });
  assert.equal(res.statusCode, 404);
});

test("PATCH /:id/shops/:shopId updates fields and emits shop.update", async () => {
  seedShop({ id: "sh1", name: "Old" });
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/campaigns/c1/shops/sh1",
    payload: { name: "New" },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().name, "New");
  assert.ok(emitted.some((e) => e.type === "shop.update"));
});

test("DELETE /:id/shops/:shopId removes the shop (204) and 404s when absent", async () => {
  seedShop({ id: "sh1" });
  const app = await buildApp();
  const ok = await app.inject({ method: "DELETE", url: "/api/campaigns/c1/shops/sh1" });
  assert.equal(ok.statusCode, 204);
  assert.equal(store.shops.length, 0);
  const gone = await app.inject({ method: "DELETE", url: "/api/campaigns/c1/shops/sh1" });
  assert.equal(gone.statusCode, 404);
});

// --- item CRUD ---

test("POST .../items creates an item and 404s for a missing shop", async () => {
  seedShop({ id: "sh1" });
  const app = await buildApp();
  const ok = await app.inject({
    method: "POST",
    url: "/api/campaigns/c1/shops/sh1/items",
    payload: { name: "Rope", price: 5 },
  });
  assert.equal(ok.statusCode, 201);
  assert.equal(ok.json().name, "Rope");

  const bad = await app.inject({
    method: "POST",
    url: "/api/campaigns/c1/shops/nope/items",
    payload: { name: "Rope" },
  });
  assert.equal(bad.statusCode, 404);
});

test("PATCH/DELETE .../items 404 when the item isn't in that campaign's shop", async () => {
  seedShop({ id: "sh1" });
  const app = await buildApp();
  const patch = await app.inject({
    method: "PATCH",
    url: "/api/campaigns/c1/shops/sh1/items/missing",
    payload: { price: 9 },
  });
  assert.equal(patch.statusCode, 404);
  const del = await app.inject({ method: "DELETE", url: "/api/campaigns/c1/shops/sh1/items/missing" });
  assert.equal(del.statusCode, 404);
});

// --- purchase ---

test("POST .../purchase deducts gold + stock, emits party/shop updates, logs", async () => {
  seedShop({ id: "sh1" });
  seedItem({ id: "it1", shopId: "sh1", price: 10, stock: 5 });
  seedMember({ id: "pm1", gold: 100 });
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/campaigns/c1/shops/sh1/items/it1/purchase",
    payload: { memberId: "pm1", quantity: 2 },
  });
  assert.equal(res.statusCode, 200);
  const body = res.json() as { member: Row; item: Row };
  assert.equal(body.member.gold, 80); // 100 - 2*10
  assert.equal(body.item.stock, 3); // 5 - 2
  assert.ok(emitted.some((e) => e.type === "party.update"));
  assert.ok(emitted.some((e) => e.type === "shop.update"));
  assert.equal(store.logs.at(-1)?.kind, "shop.purchase");

  // The party.update payload is the player-safe projection (no gold/notes).
  const partyEvt = emitted.find((e) => e.type === "party.update");
  assert.equal("gold" in (partyEvt?.payload.member ?? {}), false);
});

test("POST .../purchase rejects when the member can't afford it (400)", async () => {
  seedShop({ id: "sh1" });
  seedItem({ id: "it1", shopId: "sh1", price: 50, stock: 5 });
  seedMember({ id: "pm1", gold: 10 });
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/campaigns/c1/shops/sh1/items/it1/purchase",
    payload: { memberId: "pm1", quantity: 1 },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(store.members[0]?.gold, 10); // unchanged
});

test("POST .../purchase rejects when stock is insufficient (400)", async () => {
  seedShop({ id: "sh1" });
  seedItem({ id: "it1", shopId: "sh1", price: 1, stock: 1 });
  seedMember({ id: "pm1", gold: 100 });
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/campaigns/c1/shops/sh1/items/it1/purchase",
    payload: { memberId: "pm1", quantity: 2 },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(store.items[0]?.stock, 1); // unchanged
});

test("POST .../purchase 404s for a missing item or member", async () => {
  seedShop({ id: "sh1" });
  seedItem({ id: "it1", shopId: "sh1" });
  const app = await buildApp();
  const noItem = await app.inject({
    method: "POST",
    url: "/api/campaigns/c1/shops/sh1/items/nope/purchase",
    payload: { memberId: "pm1", quantity: 1 },
  });
  assert.equal(noItem.statusCode, 404);

  const noMember = await app.inject({
    method: "POST",
    url: "/api/campaigns/c1/shops/sh1/items/it1/purchase",
    payload: { memberId: "ghost", quantity: 1 },
  });
  assert.equal(noMember.statusCode, 404);
});

// --- generate ---

test("POST .../shops/generate creates a populated shop (201)", async () => {
  const app = await buildApp();
  const res = await app.inject({ method: "POST", url: "/api/campaigns/c1/shops/generate", payload: {} });
  assert.equal(res.statusCode, 201);
  const body = res.json() as { items: Row[] };
  assert.ok(body.items.length > 0);
  assert.equal(store.logs.at(-1)?.kind, "shop.generate");
});
