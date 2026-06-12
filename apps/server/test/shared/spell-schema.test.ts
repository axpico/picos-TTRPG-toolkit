import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSpellInput,
  listSpellsQuery,
  spell,
  updateSpellInput,
} from "@toolkit/shared";

test("spell schema accepts a full DTO", () => {
  const parsed = spell.parse({
    id: "s1",
    campaignId: null,
    name: "Fireball",
    slug: "fireball",
    level: 3,
    school: "evocation",
    castingTime: "1 action",
    range: "150 feet",
    components: "V, S, M",
    duration: "Instantaneous",
    description: "Boom.",
    higherLevels: "More boom.",
    classes: ["Wizard"],
    ritual: false,
    concentration: false,
    source: "Player's Handbook",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(parsed.name, "Fireball");
});

test("createSpellInput rejects out-of-range levels", () => {
  assert.equal(createSpellInput.safeParse({ name: "X", level: 10 }).success, false);
  assert.equal(createSpellInput.safeParse({ name: "X", level: -1 }).success, false);
  assert.equal(createSpellInput.safeParse({ name: "X", level: 9 }).success, true);
});

test("createSpellInput requires a name", () => {
  assert.equal(createSpellInput.safeParse({}).success, false);
  assert.equal(createSpellInput.safeParse({ name: "" }).success, false);
});

test("updateSpellInput accepts an empty patch", () => {
  assert.equal(updateSpellInput.safeParse({}).success, true);
});

test("listSpellsQuery coerces query-string values", () => {
  const parsed = listSpellsQuery.parse({ level: "3", includeGlobal: "true" });
  assert.equal(parsed.level, 3);
  assert.equal(parsed.includeGlobal, true);
});
