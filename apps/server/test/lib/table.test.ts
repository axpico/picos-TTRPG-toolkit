import { test } from "node:test";
import assert from "node:assert/strict";
import { pickWeighted } from "../../src/lib/table.js";

test("single entry is always picked", () => {
  const entries = [{ weight: 1, text: "only" }];
  const { index, entry } = pickWeighted(entries, () => 0.999);
  assert.equal(index, 0);
  assert.equal(entry.text, "only");
});

test("rng=0 selects the first entry", () => {
  const entries = [
    { weight: 5, text: "a" },
    { weight: 5, text: "b" },
  ];
  assert.equal(pickWeighted(entries, () => 0).index, 0);
});

test("weight boundaries select the expected entry", () => {
  const entries = [
    { weight: 1, text: "a" }, // covers roll 0
    { weight: 1, text: "b" }, // covers roll 1
    { weight: 1, text: "c" }, // covers roll 2
  ];
  // total = 3; rng*3 floors to 0/1/2
  assert.equal(pickWeighted(entries, () => 0.0).index, 0);
  assert.equal(pickWeighted(entries, () => 0.4).index, 1);
  assert.equal(pickWeighted(entries, () => 0.8).index, 2);
});

test("heavier weights claim proportionally more of the range", () => {
  const entries = [
    { weight: 9, text: "common" }, // rolls 0..8
    { weight: 1, text: "rare" }, // roll 9
  ];
  // total = 10; only the very top of the range hits "rare".
  assert.equal(pickWeighted(entries, () => 0.85).entry.text, "common");
  assert.equal(pickWeighted(entries, () => 0.95).entry.text, "rare");
});

test("weights below 1 are clamped so the entry stays selectable", () => {
  const entries = [
    { weight: 0, text: "a" },
    { weight: 0, text: "b" },
  ];
  // Both clamp to 1 → total 2; rng*2 floors to 0 or 1.
  assert.equal(pickWeighted(entries, () => 0.0).index, 0);
  assert.equal(pickWeighted(entries, () => 0.6).index, 1);
});

test("rng returning ~1 falls back to the last entry", () => {
  const entries = [
    { weight: 1, text: "a" },
    { weight: 1, text: "b" },
  ];
  assert.equal(pickWeighted(entries, () => 0.9999999999).index, 1);
});

test("empty table throws", () => {
  assert.throws(() => pickWeighted([]));
});
