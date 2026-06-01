import { test } from "node:test";
import assert from "node:assert/strict";
import type { NPC as DbNpc } from "@prisma/client";
import { toNpcDto } from "../../../src/lib/repos/npc.js";

const npc = (over: Partial<DbNpc> = {}): DbNpc => ({
  id: "npc",
  campaignId: "camp",
  name: "Garrik",
  role: "smith",
  quirk: null,
  hook: null,
  notes: null,
  tagsJson: '["urban"]',
  portraitAssetId: null,
  favorite: false,
  locationId: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...over,
});

test("parses tags and passes fields through", () => {
  const dto = toNpcDto(npc({ favorite: true }));
  assert.deepEqual(dto.tags, ["urban"]);
  assert.equal(dto.favorite, true);
  assert.equal(dto.role, "smith");
});

test("falls back to [] on malformed tags JSON", () => {
  assert.deepEqual(toNpcDto(npc({ tagsJson: "x" })).tags, []);
});
