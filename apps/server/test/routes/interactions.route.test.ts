import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { SseBus } from "../../src/plugins/sse.js";

// These routes are the cross-widget glue that has no pure-logic seam of its own:
// the Shop→Party purchase endpoint and the manual Log entry endpoint. We exercise
// them end-to-end through Fastify's `inject`, stubbing only the Prisma singleton.
// Because the real `writeLog` service imports that same singleton, mocking `db.js`
// also routes log writes through our fake — so the broadcast + log side effects
// are observable here without a database.

type Store = { item: Record<string, unknown> | null; member: Record<string, unknown> | null; logs: Record<string, unknown>[] };
const store: Store = { item: null, member: null, logs: [] };
const emitted: { campaignId: string; event: { type: string; broadcastKey?: string; payload: unknown } }[] = [];

const prisma = {
  shopItem: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      store.item && store.item.id === where.id ? store.item : null,
    update: ({ data }: { data: Record<string, unknown> }) => {
      store.item = { ...store.item, ...data };
      return store.item;
    },
  },
  partyMember: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      store.member && store.member.id === where.id ? store.member : null,
    update: ({ data }: { data: Record<string, unknown> }) => {
      store.member = { ...store.member, ...data };
      return store.member;
    },
  },
  logEntry: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `log${store.logs.length + 1}`, createdAt: new Date("2026-06-06T12:00:00Z"), ...data };
      store.logs.push(row);
      return row;
    },
    findMany: async () => store.logs,
  },
  $transaction: async (ops: unknown[]) => Promise.all(ops),
};

mock.module("../../src/db.js", { namedExports: { prisma } });

const { shopRoutes } = await import("../../src/routes/shop.js");
const { logRoutes } = await import("../../src/routes/log.js");
const Fastify = (await import("fastify")).default;

function buildApp() {
  const app = Fastify();
  const bus: SseBus = {
    emit: (campaignId, event) => emitted.push({ campaignId, event: event as never }),
    subscribe: () => () => {},
  };
  app.decorate("bus", bus);
  return app;
}

const seedItem = (over: Record<string, unknown> = {}) => ({
  id: "i1",
  shopId: "s1",
  name: "Potion",
  type: "gear",
  price: 10,
  stock: 5,
  rarity: "common",
  tagsJson: "[]",
  ...over,
});

const seedMember = (over: Record<string, unknown> = {}) => ({
  id: "m1",
  campaignId: "c1",
  userId: null,
  name: "Aria",
  playerName: null,
  hp: 10,
  hpMax: 10,
  gold: 50,
  status: "active",
  conditionsJson: "[]",
  notes: null,
  portraitAssetId: null,
  statsJson: "{}",
  order: 0,
  ...over,
});

const PURCHASE_URL = "/c1/shops/s1/items/i1/purchase";

beforeEach(() => {
  store.item = null;
  store.member = null;
  store.logs = [];
  emitted.length = 0;
});

test("purchase deducts gold, decrements stock, broadcasts, and logs the sale", async () => {
  store.item = seedItem();
  store.member = seedMember();
  const app = buildApp();
  await app.register(shopRoutes);

  const res = await app.inject({
    method: "POST",
    url: PURCHASE_URL,
    payload: { memberId: "m1", quantity: 2 },
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.member.gold, 30); // 50 - 2×10
  assert.equal(body.item.stock, 3); // 5 - 2

  const partyEvents = emitted.filter((e) => e.event.type === "party.update");
  assert.equal(partyEvents.length, 1);
  assert.equal(partyEvents[0]!.event.broadcastKey, "party");

  assert.equal(store.logs.length, 1);
  assert.equal(store.logs[0]!.kind, "shop.purchase");
  assert.deepEqual(JSON.parse(store.logs[0]!.dataJson as string), {
    memberId: "m1",
    itemId: "i1",
    quantity: 2,
    total: 20,
  });
  await app.close();
});

test("unlimited stock (null) stays null while gold is still deducted", async () => {
  store.item = seedItem({ stock: null });
  store.member = seedMember({ gold: 50 });
  const app = buildApp();
  await app.register(shopRoutes);

  const res = await app.inject({
    method: "POST",
    url: PURCHASE_URL,
    payload: { memberId: "m1", quantity: 3 },
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.item.stock, null);
  assert.equal(body.member.gold, 20); // 50 - 3×10
  await app.close();
});

test("missing item → 404 and nothing is charged or logged", async () => {
  store.item = null;
  store.member = seedMember();
  const app = buildApp();
  await app.register(shopRoutes);

  const res = await app.inject({
    method: "POST",
    url: PURCHASE_URL,
    payload: { memberId: "m1", quantity: 1 },
  });

  assert.equal(res.statusCode, 404);
  assert.match(res.json().message, /Item not found/);
  assert.equal(store.logs.length, 0);
  assert.equal(emitted.length, 0);
  await app.close();
});

test("member from another campaign → 404", async () => {
  store.item = seedItem();
  store.member = seedMember({ campaignId: "OTHER" });
  const app = buildApp();
  await app.register(shopRoutes);

  const res = await app.inject({
    method: "POST",
    url: PURCHASE_URL,
    payload: { memberId: "m1", quantity: 1 },
  });

  assert.equal(res.statusCode, 404);
  assert.match(res.json().message, /Party member not found/);
  await app.close();
});

test("not enough gold → 400 from resolvePurchase, no deduction", async () => {
  store.item = seedItem({ price: 100 });
  store.member = seedMember({ gold: 50 });
  const app = buildApp();
  await app.register(shopRoutes);

  const res = await app.inject({
    method: "POST",
    url: PURCHASE_URL,
    payload: { memberId: "m1", quantity: 1 },
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.json().message, /Not enough gold/);
  assert.equal(store.member!.gold, 50); // untouched
  assert.equal(store.logs.length, 0);
  await app.close();
});

test("manual log entry writes a note and broadcasts log.append", async () => {
  const app = buildApp();
  await app.register(logRoutes);

  const res = await app.inject({
    method: "POST",
    url: "/c1/log",
    payload: { kind: "note", message: "The party rests at the inn." },
  });

  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.kind, "note");
  assert.equal(body.message, "The party rests at the inn.");

  assert.equal(store.logs.length, 1);
  const logEvents = emitted.filter((e) => e.event.type === "log.append");
  assert.equal(logEvents.length, 1);
  await app.close();
});
