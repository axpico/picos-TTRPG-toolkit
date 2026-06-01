import { test } from "node:test";
import assert from "node:assert/strict";
import { generateShop } from "../../src/lib/shop-generator.js";

const RARITY_ORDER = ["common", "uncommon", "rare", "very rare", "legendary"];

// rng=0 makes randInt return its low bound and gives a stable shuffle/jitter.
const zero = () => 0;

test("item count respects the size range (small → at least 3)", () => {
  const shop = generateShop({ size: "small" }, zero);
  // small range is [3,6]; rng=0 picks the low bound, capped by pool size.
  assert.equal(shop.items.length, 3);
});

test("rarity cap excludes higher-rarity items", () => {
  const shop = generateShop({ flavor: "general", rarityCap: "uncommon" }, zero);
  const cap = RARITY_ORDER.indexOf("uncommon");
  for (const item of shop.items) {
    assert.ok(
      RARITY_ORDER.indexOf(item.rarity!) <= cap,
      `item "${item.name}" (${item.rarity}) exceeds the cap`,
    );
  }
});

test("default name and notes are derived from flavor/size/cap", () => {
  const shop = generateShop({}, zero);
  assert.equal(shop.name, "General stock (medium)");
  assert.match(shop.notes, /rarity cap "rare"/);
});

test("an explicit name is preserved", () => {
  const shop = generateShop({ name: "The Rusty Anchor" }, zero);
  assert.equal(shop.name, "The Rusty Anchor");
});

test("each generated item matches the CreateShopItemInput shape", () => {
  const shop = generateShop({ size: "medium", flavor: "weapons" }, zero);
  assert.ok(shop.items.length > 0);
  for (const item of shop.items) {
    assert.equal(typeof item.name, "string");
    assert.equal(typeof item.type, "string");
    assert.equal(typeof item.price, "number");
    assert.equal(typeof item.stock, "number");
    assert.ok(RARITY_ORDER.includes(item.rarity!));
  }
});
