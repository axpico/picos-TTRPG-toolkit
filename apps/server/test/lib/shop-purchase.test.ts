import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePurchase } from "../../src/lib/shop-purchase.js";

test("buys within stock and gold → ok with new balances", () => {
  const r = resolvePurchase({ price: 5, stock: 3, gold: 20, quantity: 1 });
  assert.deepEqual(r, { ok: true, total: 5, newStock: 2, newGold: 15 });
});

test("quantity multiplies price", () => {
  const r = resolvePurchase({ price: 5, stock: 10, gold: 100, quantity: 4 });
  assert.equal(r.ok, true);
  assert.deepEqual(r, { ok: true, total: 20, newStock: 6, newGold: 80 });
});

test("price null = free item, total is 0", () => {
  const r = resolvePurchase({ price: null, stock: 3, gold: 0, quantity: 2 });
  assert.deepEqual(r, { ok: true, total: 0, newStock: 1, newGold: 0 });
});

test("stock null = unlimited, never blocks and stays null", () => {
  const r = resolvePurchase({ price: 5, stock: null, gold: 50, quantity: 9 });
  assert.deepEqual(r, { ok: true, total: 45, newStock: null, newGold: 5 });
});

test("insufficient stock → 400", () => {
  const r = resolvePurchase({ price: 5, stock: 2, gold: 100, quantity: 3 });
  assert.deepEqual(r, { ok: false, status: 400, message: "Not enough stock." });
});

test("insufficient gold → 400", () => {
  const r = resolvePurchase({ price: 5, stock: 10, gold: 4, quantity: 1 });
  assert.deepEqual(r, { ok: false, status: 400, message: "Not enough gold." });
});

test("boundary: stock exactly equals quantity succeeds", () => {
  const r = resolvePurchase({ price: 1, stock: 3, gold: 10, quantity: 3 });
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.newStock, 0);
});

test("boundary: gold exactly equals total succeeds", () => {
  const r = resolvePurchase({ price: 5, stock: 10, gold: 10, quantity: 2 });
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.newGold, 0);
});

test("fractional price is rounded via Math.round", () => {
  const r = resolvePurchase({ price: 2.5, stock: 10, gold: 100, quantity: 3 });
  // 2.5 * 3 = 7.5 → 8
  assert.equal(r.ok && r.total, 8);
});
