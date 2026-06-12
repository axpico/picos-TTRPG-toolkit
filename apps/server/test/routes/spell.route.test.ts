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
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
      const row = store.spells.find((s) => s.id === where.id);
      if (!row) throw new Error("not found");
      return row;
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

mock.module("../../src/db.js", { namedExports: { prisma } });
mock.module("../../src/lib/spell-import/importer.js", { namedExports: importerMock });

const { spellRoutes } = await import("../../src/routes/spell.js");
const Fastify = (await import("fastify")).default;

async function buildApp() {
  const app = Fastify();
  const bus: SseBus = {
    emit: (campaignId, event) => {
      emitted.push({ campaignId, ...event });
    },
    subscribe: () => () => {},
    presence: () => 0,
    trackPresence: () => () => {},
  };
  app.decorate("bus", bus);
  await app.register(spellRoutes, { prefix: "/api/spells" });
  return app;
}

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
  assert.deepEqual(where.AND[0], { OR: [{ campaignId: "c1" }, { campaignId: null }] });
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

test("DELETE /api/spells/:id returns 204", async () => {
  store.spells = [seedSpell({ id: "s1" })];
  const app = await buildApp();
  const res = await app.inject({ method: "DELETE", url: "/api/spells/s1" });
  assert.equal(res.statusCode, 204);
  assert.equal(store.spells.length, 0);
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
