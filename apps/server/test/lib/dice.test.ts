import { test } from "node:test";
import assert from "node:assert/strict";
import { rollNotation, rollWithMode } from "../../src/lib/dice.js";

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

test("rollWithMode without a mode is a plain in-range roll", () => {
  for (let i = 0; i < 100; i++) {
    const r = rollWithMode("1d20");
    assert.ok(r.total >= 1 && r.total <= 20);
  }
});

test("rollWithMode advantage/disadvantage stay within a single die's range", () => {
  // The kept total is one of two independent rolls, so it must still be valid.
  for (let i = 0; i < 100; i++) {
    const adv = rollWithMode("1d6", "adv");
    const dis = rollWithMode("1d6", "dis");
    assert.ok(adv.total >= 1 && adv.total <= 6);
    assert.ok(dis.total >= 1 && dis.total <= 6);
  }
});

test("advantage keeps the higher of two rolls, disadvantage the lower", () => {
  const real = Math.random;
  // Two successive rollNotation calls consume two randoms: a low then a high.
  // randInt(1, 20) = 1 + floor(r * 20); r=0 → 1, r=0.95 → 20.
  try {
    const seq = (...vals: number[]) => {
      let i = 0;
      Math.random = () => vals[i++ % vals.length]!;
    };

    seq(0, 0.95); // first roll → 1, second roll → 20
    const adv = rollWithMode("1d20", "adv");
    assert.equal(adv.total, 20, "adv keeps the 20");
    // The breakdown must record both totals and which was kept, so the UI can
    // show that advantage actually happened.
    assert.deepEqual(adv.terms[0], { kind: "keep", mode: "adv", totals: [1, 20], kept: 20 });

    seq(0, 0.95); // first roll → 1, second roll → 20
    const dis = rollWithMode("1d20", "dis");
    assert.equal(dis.total, 1, "dis keeps the 1");
    assert.deepEqual(dis.terms[0], { kind: "keep", mode: "dis", totals: [1, 20], kept: 1 });
  } finally {
    Math.random = real;
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
    (acc, t) =>
      acc +
      (t.kind === "const" ? t.value : t.kind === "roll" ? t.rolls.reduce((a, b) => a + b, 0) : 0),
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

test("rollWithMode total equals the sum of its terms, with the keep summary contributing nothing", () => {
  // Guards the term-kind discrimination (const / roll / keep): the prepended
  // "keep" summary term must not be double-counted into the total alongside the
  // kept roll's own terms.
  const real = Math.random;
  try {
    // Each rollNotation("1d6+2") consumes one random for the d6. First roll → 1
    // (total 3), second roll → 6 (total 8); advantage keeps the second.
    const seq = (...vals: number[]) => {
      let i = 0;
      Math.random = () => vals[i++ % vals.length]!;
    };
    seq(0, 0.95);
    const adv = rollWithMode("1d6+2", "adv");
    assert.equal(adv.total, 8);
    assert.equal(adv.terms[0]!.kind, "keep");
    const sum = adv.terms.reduce(
      (acc, t) =>
        acc +
        (t.kind === "const"
          ? t.value
          : t.kind === "roll"
            ? t.rolls.reduce((a, b) => a + b, 0)
            : 0),
      0,
    );
    assert.equal(sum, adv.total);

    // Disadvantage keeps the lower (first) roll's total of 3.
    seq(0, 0.95);
    const dis = rollWithMode("1d6+2", "dis");
    assert.equal(dis.total, 3);
  } finally {
    Math.random = real;
  }
});
