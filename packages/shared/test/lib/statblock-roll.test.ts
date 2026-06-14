import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signedMod,
  parseModifierList,
  parseAction,
  abilityCheckNotation,
  initiativeNotation,
} from "../../src/lib/statblock-roll.js";
import { emptyStatBlock } from "../../src/schemas/statblock.js";

test("signedMod renders the sign for positive, negative, and zero", () => {
  assert.equal(signedMod(3), "+3");
  assert.equal(signedMod(-1), "-1");
  assert.equal(signedMod(0), "+0");
});

test("parseModifierList parses ability entries with canonical keys", () => {
  assert.deepEqual(parseModifierList("DEX +5, CON +3"), [
    { name: "DEX", mod: 5, ability: "dex" },
    { name: "CON", mod: 3, ability: "con" },
  ]);
});

test("parseModifierList maps full ability names and omits ability for skills", () => {
  assert.deepEqual(parseModifierList("Strength +2, Perception +4"), [
    { name: "Strength", mod: 2, ability: "str" },
    { name: "Perception", mod: 4 },
  ]);
});

test("parseModifierList tolerates whitespace and a spaced sign", () => {
  assert.deepEqual(parseModifierList("  Stealth + 6 "), [{ name: "Stealth", mod: 6 }]);
});

test("parseModifierList returns [] for empty or unparseable input", () => {
  assert.deepEqual(parseModifierList(""), []);
  assert.deepEqual(parseModifierList(null), []);
  assert.deepEqual(parseModifierList("no numbers here, ; "), []);
});

test("parseAction extracts toHit and multiple damage clauses with types", () => {
  const result = parseAction(
    "+5 to hit, reach 5 ft. Hit: 7 (1d8 + 3) slashing damage plus 3 (1d6) fire damage",
  );
  assert.equal(result.toHit, 5);
  assert.deepEqual(result.damage, [
    { notation: "1d8+3", type: "slashing" },
    { notation: "1d6", type: "fire" },
  ]);
});

test("parseAction returns empty damage for missing/blank descriptions", () => {
  assert.deepEqual(parseAction(null), { damage: [] });
  assert.deepEqual(parseAction(""), { damage: [] });
});

test("abilityCheckNotation uses the ability modifier, adding prof only when proficient", () => {
  assert.equal(abilityCheckNotation(14), "1d20+2");
  assert.equal(abilityCheckNotation(14, 3), "1d20+2");
  assert.equal(abilityCheckNotation(14, 3, { proficient: true }), "1d20+5");
});

test("abilityCheckNotation drops the suffix when the modifier is zero", () => {
  assert.equal(abilityCheckNotation(null), "1d20");
  assert.equal(abilityCheckNotation(10), "1d20");
});

test("initiativeNotation derives from the DEX modifier", () => {
  const stats = { ...emptyStatBlock(), abilities: { ...emptyStatBlock().abilities, dex: 16 } };
  assert.equal(initiativeNotation(stats), "1d20+3");
});
