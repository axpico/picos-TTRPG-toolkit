import { test } from "node:test";
import assert from "node:assert/strict";
import { generateNpc } from "../../src/lib/npc-generator.js";

test("the same seed produces the same NPC", () => {
  const a = generateNpc({ seed: "abc" });
  const b = generateNpc({ seed: "abc" });
  assert.deepEqual(a, b);
});

test("different seeds generally differ", () => {
  const a = generateNpc({ seed: "seed-one" });
  const b = generateNpc({ seed: "seed-two" });
  assert.notDeepEqual(a, b);
});

test("name has a 'Given Family' shape", () => {
  const npc = generateNpc({ seed: "name" });
  assert.match(npc.name, /^\S+ \S+$/);
});

test("an explicit role overrides the random table", () => {
  const npc = generateNpc({ seed: "x", role: "  harbormaster " });
  assert.equal(npc.role, "harbormaster");
});

test("unknown culture falls back to the generic name table", () => {
  // Should not throw and should still produce a valid name.
  const npc = generateNpc({ seed: "x", culture: "atlantean" });
  assert.match(npc.name, /^\S+ \S+$/);
});

test("region and culture are added to tags and de-duplicated", () => {
  const npc = generateNpc({ seed: "tags", region: "Harbor", culture: "Northern" });
  assert.ok(npc.tags.includes("harbor"));
  assert.ok(npc.tags.includes("northern"));
  assert.equal(npc.tags.length, new Set(npc.tags).size);
});

test("produces non-empty quirk and hook", () => {
  const npc = generateNpc({ seed: "q" });
  assert.ok(npc.quirk.length > 0);
  assert.ok(npc.hook.length > 0);
});
