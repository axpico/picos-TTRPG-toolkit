import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { SseBus } from "../../src/plugins/sse.js";

// CRUD + import-trigger coverage for /api/spells, with the Prisma singleton and
// the importer stubbed (no network, no DB).

type Row = Record<string, unknown>;
const store: { spells: Row[]; logs: Row[] } = { spells: [], logs: [] };
const calls: { findMany: Row[]; updates: Row[] } = { findMany: [], updates: [] };
const emitted: Row[] = [];

let nextId = 1;
const seedSpell = (overrides: Row = {}): Row => ({
  id: `s${nextId++}`,
  campaignId: null,
  ownerUserId: null, // shared read-only seed by default
  name: "Fireball",
  slug: null,
  level: 3,
  school: "evocation",
  castingTime: "1 action",
  range: "150 feet",
  components: "V, S, M",
  duration: "Instantaneous",
  description: "Boom.",
  higherLevels: null,
  classesJson: '["Wizard"]',
  ritual: false,
  concentration: false,
  source: null,
  tagsJson: "[]",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

const prisma = {
  spell: {
    findMany: async (args: Row) => {
      calls.findMany.push(args);
      return store.spells;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      return store.spells.find((s) => s.id === where.id) ?? null;
    },
    create: async ({ data }: { data: Row }) => {
      const row = seedSpell(data);
      store.spells.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      calls.updates.push(data);
      const row = store.spells.find((s) => s.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const idx = store.spells.findIndex((s) => s.id === where.id);
      const [row] = store.spells.splice(idx, 1);
      return row!;
    },
  },
  logEntry: {
    create: async ({ data }: { data: Row }) => {
      store.logs.push(data);
      return { id: `log${store.logs.length}`, createdAt: new Date(), ...data };
    },
  },
};

let importRunning = false;
const importerMock = {
  startImport: () => {
    if (importRunning) return false;
    importRunning = true;
    return true;
  },
  getImportState: () => ({
    status: importRunning ? "running" : "idle",
    total: 0,
    done: 0,
    failed: [],
    startedAt: null,
    finishedAt: null,
    error: null,
  }),
};

mock.module("../../src/db.js", { exports: { prisma } });
mock.module("../../src/lib/spell-import/importer.js", { exports: importerMock });

const { spellRoutes } = await import("../../src/routes/spell.js");
const Fastify = (await import("fastify")).default;

// Test stand-ins for the session-plugin authorization helpers, mirroring their
// real semantics against a fixed current user + a configurable DM-membership
// predicate. This keeps the route tests independent of the session plugin while
// still exercising the per-user/per-campaign rules the handlers rely on.
const CURRENT_USER = "u1";
const libraryVisibleTo = (uid: string | null) => ({
  campaignId: null,
  OR: [{ ownerUserId: null }, ...(uid ? [{ ownerUserId: uid }] : [])],
});

interface AppOpts {
  userId?: string | null;
  isDm?: (campaignId: string) => boolean;
}
type Reply = { code: (n: number) => { send: (b: unknown) => unknown } };
type LibRow = { campaignId: string | null; ownerUserId: string | null };
const forbid = (reply: Reply) => {
  reply.code(403).send({ error: { code: "forbidden", message: "denied" } });
  return false;
};

async function buildApp(opts: AppOpts = {}) {
  const userId = opts.userId === undefined ? CURRENT_USER : opts.userId;
  const isDm = opts.isDm ?? (() => true);
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
  app.decorate("getUserId", async () => userId);
  app.decorate("assertCampaignDm", async (_req: unknown, reply: Reply, campaignId: string | null | undefined) =>
    !campaignId || isDm(campaignId) ? true : forbid(reply),
  );
  app.decorate("assertCanReadRow", async (_req: unknown, reply: Reply, row: LibRow) => {
    if (row.campaignId) return isDm(row.campaignId) ? true : forbid(reply);
    return row.ownerUserId === null || row.ownerUserId === userId ? true : forbid(reply);
  });
  app.decorate("assertCanWriteRow", async (_req: unknown, reply: Reply, row: LibRow) => {
    if (row.campaignId) return isDm(row.campaignId) ? true : forbid(reply);
    return row.ownerUserId === userId ? true : forbid(reply);
  });
  await app.register(spellRoutes, { prefix: "/api/spells" });
  return app;
}

const notDm: AppOpts = { isDm: () => false };

beforeEach(() => {
  store.spells = [];
  store.logs = [];
  calls.findMany.length = 0;
  calls.updates.length = 0;
  emitted.length = 0;
  importRunning = false;
  nextId = 1;
});

test("POST /api/spells creates a global spell with defaults", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/spells",
    payload: { name: "My Custom Spell" },
  });
  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.name, "My Custom Spell");
  assert.equal(body.campaignId, null);
  assert.equal(store.logs.length, 0); // no log for global entries
});

test("POST /api/spells logs for campaign-scoped spells", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/spells",
    payload: { name: "Hex", campaignId: "c1" },
  });
  assert.equal(res.statusCode, 201);
  assert.equal(res.json().campaignId, "c1");
  assert.equal(store.logs.length, 1);
  assert.equal(store.logs[0]?.kind, "spell.create");
});

test("GET /api/spells builds the includeGlobal OR-where", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/spells?campaignId=c1&includeGlobal=true&level=3",
  });
  assert.equal(res.statusCode, 200);
  const where = calls.findMany[0]?.where as { AND: Row[] };
  assert.deepEqual(where.AND[0], { OR: [{ campaignId: "c1" }, libraryVisibleTo(CURRENT_USER)] });
  assert.deepEqual(where.AND[1], { level: 3 });
});

test("GET /api/spells filters by class post-query", async () => {
  store.spells = [
    seedSpell({ classesJson: '["Wizard"]' }),
    seedSpell({ name: "Cure Wounds", classesJson: '["Cleric"]' }),
  ];
  const app = await buildApp();
  const res = await app.inject({ method: "GET", url: "/api/spells?class=cleric" });
  const body = res.json() as { name: string }[];
  assert.deepEqual(
    body.map((s) => s.name),
    ["Cure Wounds"],
  );
});

test("PATCH /api/spells/:id sends only provided fields and emits for campaign spells", async () => {
  store.spells = [seedSpell({ id: "s1", campaignId: "c1" })];
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/spells/s1",
    payload: { range: "90 feet" },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls.updates[0], { range: "90 feet" });
  // writeLog emits its own bus event; we only care about the spells one.
  const spellEvents = emitted.filter((e) => e.type === "spells.update");
  assert.equal(spellEvents.length, 1);
  assert.equal(spellEvents[0]?.broadcastKey, "spells");
});

test("DELETE /api/spells/:id removes the caller's own library spell", async () => {
  store.spells = [seedSpell({ id: "s1", ownerUserId: CURRENT_USER })];
  const app = await buildApp();
  const res = await app.inject({ method: "DELETE", url: "/api/spells/s1" });
  assert.equal(res.statusCode, 204);
  assert.equal(store.spells.length, 0);
});

test("GET /api/spells without campaignId shows the caller's library, not others'", async () => {
  const app = await buildApp();
  const res = await app.inject({ method: "GET", url: "/api/spells" });
  assert.equal(res.statusCode, 200);
  const where = calls.findMany[0]?.where as { AND: Row[] };
  assert.deepEqual(where.AND[0], libraryVisibleTo(CURRENT_USER));
});

test("GET /api/spells?campaignId=X is rejected for a non-DM of X", async () => {
  const app = await buildApp(notDm);
  const res = await app.inject({ method: "GET", url: "/api/spells?campaignId=c2" });
  assert.equal(res.statusCode, 403);
  assert.equal(calls.findMany.length, 0); // short-circuited before querying
});

test("PATCH /api/spells/:id is rejected for a non-DM of the spell's campaign", async () => {
  store.spells = [seedSpell({ id: "s1", campaignId: "c1" })];
  const app = await buildApp(notDm);
  const res = await app.inject({
    method: "PATCH",
    url: "/api/spells/s1",
    payload: { range: "90 feet" },
  });
  assert.equal(res.statusCode, 403);
  assert.equal(calls.updates.length, 0);
});

test("DELETE /api/spells/:id is rejected for a non-DM of the spell's campaign", async () => {
  store.spells = [seedSpell({ id: "s1", campaignId: "c1" })];
  const app = await buildApp(notDm);
  const res = await app.inject({ method: "DELETE", url: "/api/spells/s1" });
  assert.equal(res.statusCode, 403);
  assert.equal(store.spells.length, 1); // not deleted
});

test("GET /api/spells/:id returns 404 for a missing spell", async () => {
  const app = await buildApp();
  const res = await app.inject({ method: "GET", url: "/api/spells/nope" });
  assert.equal(res.statusCode, 404);
});

test("POST /api/spells without campaignId owns the row to the caller", async () => {
  const app = await buildApp();
  const res = await app.inject({ method: "POST", url: "/api/spells", payload: { name: "Mine" } });
  assert.equal(res.statusCode, 201);
  assert.equal(store.spells[0]?.ownerUserId, CURRENT_USER);
  assert.equal(store.spells[0]?.campaignId, null);
});

test("POST /api/spells with a campaignId leaves the row campaign-owned (null owner)", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/spells",
    payload: { name: "Hex", campaignId: "c1" },
  });
  assert.equal(res.statusCode, 201);
  assert.equal(store.spells[0]?.ownerUserId, null);
});

test("PATCH/DELETE on the shared seed (null owner) is rejected", async () => {
  store.spells = [seedSpell({ id: "s1", ownerUserId: null })];
  const app = await buildApp();
  const patch = await app.inject({ method: "PATCH", url: "/api/spells/s1", payload: { range: "x" } });
  assert.equal(patch.statusCode, 403);
  const del = await app.inject({ method: "DELETE", url: "/api/spells/s1" });
  assert.equal(del.statusCode, 403);
  assert.equal(store.spells.length, 1);
});

test("GET/PATCH on another user's library spell is rejected", async () => {
  store.spells = [seedSpell({ id: "s1", ownerUserId: "u2" })];
  const app = await buildApp();
  const read = await app.inject({ method: "GET", url: "/api/spells/s1" });
  assert.equal(read.statusCode, 403);
  const patch = await app.inject({ method: "PATCH", url: "/api/spells/s1", payload: { range: "x" } });
  assert.equal(patch.statusCode, 403);
});

test("POST /api/spells/import starts a job, then 409s while running", async () => {
  const app = await buildApp();
  const first = await app.inject({ method: "POST", url: "/api/spells/import", payload: {} });
  assert.equal(first.statusCode, 202);
  assert.equal(first.json().started, true);

  const second = await app.inject({ method: "POST", url: "/api/spells/import", payload: {} });
  assert.equal(second.statusCode, 409);
  assert.equal(second.json().started, false);

  const status = await app.inject({ method: "GET", url: "/api/spells/import/status" });
  assert.equal(status.json().status, "running");
});
