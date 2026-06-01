import { test } from "node:test";
import assert from "node:assert/strict";
import { rollNotation } from "../../src/lib/dice.js";

test("a constant evaluates to itself", () => {
  const r = rollNotation("5");
  assert.equal(r.total, 5);
  assert.deepEqual(r.terms, [{ kind: "const", value: 5 }]);
});

test("1d20 stays within [1, 20] and reports one roll", () => {
  for (let i = 0; i < 200; i++) {
    const r = rollNotation("1d20");
    assert.ok(r.total >= 1 && r.total <= 20, `total ${r.total} out of range`);
    const term = r.terms[0]!;
    assert.equal(term.kind, "roll");
    if (term.kind === "roll") {
      assert.equal(term.count, 1);
      assert.equal(term.sides, 20);
      assert.equal(term.rolls.length, 1);
    }
  }
});

test("compound notation 2d6+1d4-2 parses into the expected terms", () => {
  const r = rollNotation("2d6+1d4-2");
  assert.equal(r.terms.length, 3);
  assert.deepEqual(
    r.terms.map((t) => t.kind),
    ["roll", "roll", "const"],
  );
  const [d6, d4, k] = r.terms as [typeof r.terms[number], typeof r.terms[number], typeof r.terms[number]];
  assert.ok(d6.kind === "roll" && d6.count === 2 && d6.sides === 6);
  assert.ok(d4.kind === "roll" && d4.count === 1 && d4.sides === 4);
  assert.ok(k.kind === "const" && k.value === -2);
});

test("total equals the sum of all term contributions", () => {
  const r = rollNotation("3d8+4");
  const sum = r.terms.reduce(
    (acc, t) => acc + (t.kind === "const" ? t.value : t.rolls.reduce((a, b) => a + b, 0)),
    0,
  );
  assert.equal(r.total, sum);
});

test("breakdownJson round-trips to the terms array", () => {
  const r = rollNotation("2d6");
  assert.deepEqual(JSON.parse(r.breakdownJson), r.terms);
});

test("whitespace is ignored", () => {
  const r = rollNotation(" 1d4 + 2 ");
  assert.equal(r.terms.length, 2);
});
