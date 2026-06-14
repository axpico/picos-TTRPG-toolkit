import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStatBlock, hitDieFor, describeBuild } from "../../src/lib/statblock-generator.js";

test("buildStatBlock matches the tier table for a given CR", () => {
  // CR 5 (npc) → tier index 5: ac 15, hp 115, profBonus 3.
  const sb = buildStatBlock({ kind: "npc", crOrLevel: "5", archetype: "brute" });
  assert.equal(sb.ac, 15);
  assert.equal(sb.hp, 115);
  assert.equal(sb.hpMax, 115);
  assert.equal(sb.profBonus, 3);
});

test("the archetype's primary ability gets the highest score", () => {
  const brute = buildStatBlock({ kind: "npc", crOrLevel: "5", archetype: "brute" });
  const scores = Object.values(brute.abilities).filter((v): v is number => v != null);
  assert.equal(brute.abilities.str, Math.max(...scores)); // brute primary = str

  const caster = buildStatBlock({ kind: "npc", crOrLevel: "5", archetype: "caster" });
  const casterScores = Object.values(caster.abilities).filter((v): v is number => v != null);
  assert.equal(caster.abilities.int, Math.max(...casterScores)); // caster primary = int
});

test("npc/player builds set level and clear cr", () => {
  const sb = buildStatBlock({ kind: "npc", crOrLevel: "5", archetype: "brute" });
  assert.equal(sb.level, 5);
  assert.equal(sb.cr, null);
});

test("beast builds set cr (including fractional) without throwing", () => {
  const sb = buildStatBlock({ kind: "beast", crOrLevel: "1/2", archetype: "caster" });
  assert.equal(sb.cr, "1/2");
});

test("a stock attack action is generated with name and description", () => {
  const sb = buildStatBlock({ kind: "npc", crOrLevel: "5", archetype: "brute" });
  assert.equal(sb.actions.length, 1);
  assert.equal(sb.actions[0]?.name, "Heavy Strike");
  assert.match(sb.actions[0]?.desc ?? "", /to hit/);
});

test("hitDieFor reads the tier table and clamps out-of-range CR", () => {
  assert.equal(hitDieFor("5", "npc"), 10);
  assert.equal(hitDieFor(999, "npc"), 20); // clamps to the top tier
  assert.equal(hitDieFor(-3, "npc"), 6); // clamps to the bottom tier
});

test("describeBuild labels CR for creatures and Level for players", () => {
  assert.equal(describeBuild({ kind: "npc", crOrLevel: "5", archetype: "brute" }), "CR 5 · brute");
  assert.equal(describeBuild({ kind: "player", crOrLevel: 3, archetype: "caster" }), "Level 3 · caster");
});
