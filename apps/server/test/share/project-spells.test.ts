import { test } from "node:test";
import assert from "node:assert/strict";
import type { Spell } from "@toolkit/shared";
import { pinnedSpellIds, projectPinnedSpells } from "../../src/share/projectSpells.js";

const spell = (over: Partial<Spell> = {}): Spell => ({
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
  higherLevels: null,
  classes: ["Wizard"],
  ritual: false,
  concentration: false,
  source: "PHB",
  tags: ["secret"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

test("pinnedSpellIds reads the multi-pin array", () => {
  assert.deepEqual(pinnedSpellIds({ spellIds: ["a", "b"] }), ["a", "b"]);
});

test("pinnedSpellIds falls back to the legacy single spellId", () => {
  assert.deepEqual(pinnedSpellIds({ spellId: "a" }), ["a"]);
});

test("pinnedSpellIds is empty for an absent/blank payload", () => {
  assert.deepEqual(pinnedSpellIds({}), []);
  assert.deepEqual(pinnedSpellIds({ spellId: "" }), []);
  assert.deepEqual(pinnedSpellIds({ spellIds: [1, "", "x"] }), ["x"]);
});

test("projectPinnedSpells preserves pinned order and strips GM tags", () => {
  const rows = [spell({ id: "a", name: "Aid" }), spell({ id: "b", name: "Bless" })];
  const out = projectPinnedSpells(rows, "camp", ["b", "a"]);
  assert.ok(out);
  assert.deepEqual(out!.map((s) => s.name), ["Bless", "Aid"]);
  // tags/slug/campaignId are not part of the player-safe shape.
  assert.equal("tags" in out![0]!, false);
  assert.equal("slug" in out![0]!, false);
});

test("projectPinnedSpells allows library + own-campaign rows, drops foreign ones", () => {
  const rows = [
    spell({ id: "lib", campaignId: null }),
    spell({ id: "mine", campaignId: "camp" }),
    spell({ id: "theirs", campaignId: "other" }),
  ];
  const out = projectPinnedSpells(rows, "camp", ["lib", "mine", "theirs"]);
  assert.deepEqual(out!.map((s) => s.id), ["lib", "mine"]);
});

test("projectPinnedSpells returns null when nothing is left to show", () => {
  const rows = [spell({ id: "theirs", campaignId: "other" })];
  assert.equal(projectPinnedSpells(rows, "camp", ["theirs"]), null);
  assert.equal(projectPinnedSpells(rows, "camp", ["missing"]), null);
});
