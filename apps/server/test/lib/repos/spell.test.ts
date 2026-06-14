import { test } from "node:test";
import assert from "node:assert/strict";
import type { Spell as DbSpell } from "@prisma/client";
import { toSpellDto } from "../../../src/lib/repos/spell.js";

const spell = (over: Partial<DbSpell> = {}): DbSpell => ({
  id: "sp",
  campaignId: null,
  ownerUserId: null,
  name: "Fireball",
  slug: "fireball",
  level: 3,
  school: "evocation",
  castingTime: "1 action",
  range: "150 feet",
  components: "V, S, M",
  duration: "Instantaneous",
  description: "Boom.",
  higherLevels: "+1d6 per slot",
  classesJson: '["Wizard","Sorcerer"]',
  ritual: false,
  concentration: false,
  source: "PHB",
  tagsJson: '["fire"]',
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-02-02T00:00:00.000Z"),
  ...over,
});

test("classes JSON is parsed into an array", () => {
  assert.deepEqual(toSpellDto(spell()).classes, ["Wizard", "Sorcerer"]);
});

test("tags JSON is parsed into an array", () => {
  assert.deepEqual(toSpellDto(spell()).tags, ["fire"]);
});

test("malformed classes/tags JSON falls back to []", () => {
  const dto = toSpellDto(spell({ classesJson: "{", tagsJson: "not json" }));
  assert.deepEqual(dto.classes, []);
  assert.deepEqual(dto.tags, []);
});

test("non-array JSON (object) falls back to []", () => {
  assert.deepEqual(toSpellDto(spell({ classesJson: '{"x":1}' })).classes, []);
});

test("nullable fields pass through", () => {
  const dto = toSpellDto(
    spell({ campaignId: null, slug: null, higherLevels: null, source: null }),
  );
  assert.equal(dto.campaignId, null);
  assert.equal(dto.slug, null);
  assert.equal(dto.higherLevels, null);
  assert.equal(dto.source, null);
});

test("scalar fields pass through", () => {
  const dto = toSpellDto(spell({ level: 5, ritual: true, concentration: true }));
  assert.equal(dto.level, 5);
  assert.equal(dto.ritual, true);
  assert.equal(dto.concentration, true);
  assert.equal(dto.school, "evocation");
});

test("timestamps are serialized to ISO strings", () => {
  const dto = toSpellDto(spell());
  assert.equal(dto.createdAt, "2026-01-01T00:00:00.000Z");
  assert.equal(dto.updatedAt, "2026-02-02T00:00:00.000Z");
});
