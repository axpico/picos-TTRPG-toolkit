import { z } from "zod";
import type { Shop as ShopDto, ShopItem as ShopItemDto } from "@toolkit/shared";
import type { Shop as DbShop, ShopItem as DbShopItem } from "@prisma/client";
import { parseJsonField } from "../json.js";

const tagsSchema = z.array(z.string());

export function toShopItemDto(row: DbShopItem): ShopItemDto {
  return {
    id: row.id,
    shopId: row.shopId,
    name: row.name,
    type: row.type,
    price: row.price,
    stock: row.stock,
    rarity: row.rarity,
    tags: parseJsonField(row.tagsJson, tagsSchema, []),
  };
}

export function toShopDto(row: DbShop & { items: DbShopItem[] }): ShopDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    notes: row.notes,
    items: row.items.map(toShopItemDto),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
