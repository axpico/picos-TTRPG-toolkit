import { z } from "zod";

export const shopItem = z.object({
  id: z.string(),
  shopId: z.string(),
  name: z.string(),
  type: z.string().nullable(),
  price: z.number().nullable(),
  stock: z.number().int().nullable(),
  rarity: z.string().nullable(),
  tags: z.array(z.string()),
});
export type ShopItem = z.infer<typeof shopItem>;

export const shop = z.object({
  id: z.string(),
  campaignId: z.string(),
  name: z.string(),
  notes: z.string().nullable(),
  items: z.array(shopItem),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Shop = z.infer<typeof shop>;

export const createShopInput = z.object({
  name: z.string().min(1).max(120),
  notes: z.string().max(4000).optional(),
});
export type CreateShopInput = z.infer<typeof createShopInput>;

export const updateShopInput = createShopInput.partial();
export type UpdateShopInput = z.infer<typeof updateShopInput>;

export const createShopItemInput = z.object({
  name: z.string().min(1).max(120),
  type: z.string().max(60).optional(),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().min(0).optional(),
  rarity: z.string().max(40).optional(),
  tags: z.array(z.string().min(1).max(40)).max(40).optional(),
});
export type CreateShopItemInput = z.infer<typeof createShopItemInput>;

export const updateShopItemInput = createShopItemInput.partial();
export type UpdateShopItemInput = z.infer<typeof updateShopItemInput>;

export const generateShopInput = z.object({
  name: z.string().max(120).optional(),
  flavor: z.enum(["general", "weapons", "alchemy", "magical", "spacer"]).optional(),
  size: z.enum(["small", "medium", "large"]).optional(),
  rarityCap: z.enum(["common", "uncommon", "rare", "very rare", "legendary"]).optional(),
});
export type GenerateShopInput = z.infer<typeof generateShopInput>;
