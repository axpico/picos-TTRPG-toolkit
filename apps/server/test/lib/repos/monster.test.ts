import { test } from "node:test";
import assert from "node:assert/strict";
import type { Monster as DbMonster } from "@prisma/client";
import { toMonsterDto } from "../../../src/lib/repos/monster.js";

const monster = (over: Partial<DbMonster> = {}): DbMonster => ({
  id: "mon",
  campaignId: "camp",
  ownerUserId: null,
  name: "Owlbear",
  type: "beast",
  environment: "forest",
  challenge: "3",
  statsJson: '{"ac":13,"hp":59}',
  notes: null,
  tagsJson: '["dangerous"]',
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...over,
});

test("parses stats record and tags", () => {
  const dto = toMonsterDto(monster());
  assert.equal(dto.stats.ac, 13);
  assert.equal(dto.stats.hp, 59);
  // Unspecified stat-block fields default rather than being dropped.
  assert.equal(dto.stats.hpMax, null);
  assert.deepEqual(dto.stats.actions, []);
  assert.deepEqual(dto.tags, ["dangerous"]);
});

test("falls back to an empty stat block and [] tags on malformed JSON", () => {
  const dto = toMonsterDto(monster({ statsJson: "x", tagsJson: "y" }));
  assert.equal(dto.stats.ac, null);
  assert.equal(dto.stats.hp, null);
  assert.deepEqual(dto.tags, []);
});
