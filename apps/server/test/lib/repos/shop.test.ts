import { test } from "node:test";
import assert from "node:assert/strict";
import type { Shop as DbShop, ShopItem as DbShopItem } from "@prisma/client";
import { toShopDto, toShopItemDto } from "../../../src/lib/repos/shop.js";

const item = (over: Partial<DbShopItem> = {}): DbShopItem => ({
  id: "it",
  shopId: "shop",
  name: "Lantern",
  type: "supply",
  price: 5,
  stock: 3,
  rarity: "common",
  tagsJson: '["light"]',
  ...over,
});

test("toShopItemDto parses tags, malformed falls back to []", () => {
  assert.deepEqual(toShopItemDto(item()).tags, ["light"]);
  assert.deepEqual(toShopItemDto(item({ tagsJson: "x" })).tags, []);
});

test("toShopDto maps items and serializes dates", () => {
  const shop: DbShop & { items: DbShopItem[] } = {
    id: "shop",
    campaignId: "camp",
    name: "General Store",
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    items: [item({ id: "a" }), item({ id: "b", name: "Rope" })],
  };
  const dto = toShopDto(shop);
  assert.equal(dto.items.length, 2);
  assert.equal(dto.items[1]!.name, "Rope");
  assert.equal(dto.createdAt, "2026-01-01T00:00:00.000Z");
});
