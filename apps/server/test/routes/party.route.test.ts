import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { SseBus } from "../../src/plugins/sse.js";

// Regression coverage for the player-linking path: PATCH /:id/party/:memberId
// must persist `userId` (the DM assigning a character to a player account).
// Exercised through Fastify's `inject` with the Prisma singleton stubbed.

type Row = Record<string, unknown>;
const store: { member: Row; logs: Row[] } = { member: {}, logs: [] };
const updates: Row[] = [];

const prisma = {
  partyMember: {
    findFirst: async ({ where }: { where: { id: string; campaignId: string } }) =>
      store.member.id === where.id && store.member.campaignId === where.campaignId
        ? store.member
        : null,
    update: async ({ data }: { data: Row }) => {
      updates.push(data);
      store.member = { ...store.member, ...data };
      return store.member;
    },
  },
  logEntry: {
    create: async ({ data }: { data: Row }) => {
      store.logs.push(data);
      return { id: `log${store.logs.length}`, createdAt: new Date(), ...data };
    },
  },
};

mock.module("../../src/db.js", { exports: { prisma } });

const { partyRoutes } = await import("../../src/routes/party.js");
const Fastify = (await import("fastify")).default;

function buildApp() {
  const app = Fastify();
  const bus: SseBus = {
    emit: () => {},
    subscribe: () => () => {},
    presence: () => 0,
    trackPresence: () => () => {},
  };
  app.decorate("bus", bus);
  return app;
}

const seedMember = (): Row => ({
  id: "m1",
  campaignId: "c1",
  userId: null,
  name: "Aria",
  playerName: null,
  hp: 10,
  hpMax: 12,
  gold: 0,
  status: "active",
  conditionsJson: "[]",
  notes: null,
  portraitAssetId: null,
  statsJson: "{}",
  order: 0,
});

beforeEach(() => {
  store.member = seedMember();
  store.logs = [];
  updates.length = 0;
});

test("PATCH party member persists userId when linking a player", async () => {
  const app = buildApp();
  await app.register(partyRoutes, { prefix: "/api/campaigns" });

  const res = await app.inject({
    method: "PATCH",
    url: "/api/campaigns/c1/party/m1",
    payload: { userId: "u-sam" },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(updates[0]?.userId, "u-sam");
  assert.equal(res.json().userId, "u-sam");
});

test("PATCH party member clears userId when unlinking", async () => {
  store.member = { ...seedMember(), userId: "u-sam" };
  const app = buildApp();
  await app.register(partyRoutes, { prefix: "/api/campaigns" });

  const res = await app.inject({
    method: "PATCH",
    url: "/api/campaigns/c1/party/m1",
    payload: { userId: null },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(updates[0]?.userId, null);
  assert.equal(res.json().userId, null);
});

test("PATCH party member leaves userId untouched when not in the payload", async () => {
  store.member = { ...seedMember(), userId: "u-sam" };
  const app = buildApp();
  await app.register(partyRoutes, { prefix: "/api/campaigns" });

  const res = await app.inject({
    method: "PATCH",
    url: "/api/campaigns/c1/party/m1",
    payload: { hp: 5 },
  });

  assert.equal(res.statusCode, 200);
  assert.equal("userId" in (updates[0] ?? {}), false);
  assert.equal(res.json().userId, "u-sam");
});
