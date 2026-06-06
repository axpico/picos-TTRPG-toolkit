import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createShopInput,
  createShopItemInput,
  generateShopInput,
  purchaseShopItemInput,
  updateShopInput,
  updateShopItemInput,
} from "@toolkit/shared";
import { prisma } from "../db.js";
import { toShopDto, toShopItemDto } from "../lib/repos/shop.js";
import { toPartyDto } from "../lib/repos/party.js";
import { generateShop } from "../lib/shop-generator.js";
import { resolvePurchase } from "../lib/shop-purchase.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });
const shopParams = z.object({ id: z.string().min(1), shopId: z.string().min(1) });
const itemParams = z.object({
  id: z.string().min(1),
  shopId: z.string().min(1),
  itemId: z.string().min(1),
});

export const shopRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/shops", async (req) => {
    const { id } = cidParams.parse(req.params);
    const rows = await prisma.shop.findMany({
      where: { campaignId: id },
      include: { items: true },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toShopDto);
  });

  app.post("/:id/shops", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = createShopInput.parse(req.body);
    const created = await prisma.shop.create({
      data: { campaignId: id, name: body.name, notes: body.notes ?? null },
      include: { items: true },
    });
    await writeLog(app, id, "shop.create", `Created shop: ${created.name}`);
    reply.code(201);
    return toShopDto(created);
  });

  app.get("/:id/shops/:shopId", async (req) => {
    const { shopId } = shopParams.parse(req.params);
    const row = await prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      include: { items: true },
    });
    return toShopDto(row);
  });

  app.patch("/:id/shops/:shopId", async (req) => {
    const { id, shopId } = shopParams.parse(req.params);
    const body = updateShopInput.parse(req.body);
    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
      },
      include: { items: true },
    });
    await writeLog(app, id, "shop.update", `Updated shop: ${updated.name}`);
    return toShopDto(updated);
  });

  app.delete("/:id/shops/:shopId", async (req, reply) => {
    const { id, shopId } = shopParams.parse(req.params);
    const row = await prisma.shop.delete({ where: { id: shopId } });
    await writeLog(app, id, "shop.delete", `Deleted shop: ${row.name}`);
    reply.code(204).send();
  });

  // --- items ---
  app.post("/:id/shops/:shopId/items", async (req, reply) => {
    const { shopId } = shopParams.parse(req.params);
    const body = createShopItemInput.parse(req.body);
    const created = await prisma.shopItem.create({
      data: {
        shopId,
        name: body.name,
        type: body.type ?? null,
        price: body.price ?? null,
        stock: body.stock ?? null,
        rarity: body.rarity ?? null,
        tagsJson: JSON.stringify(body.tags ?? []),
      },
    });
    reply.code(201);
    return toShopItemDto(created);
  });

  app.patch("/:id/shops/:shopId/items/:itemId", async (req) => {
    const { itemId } = itemParams.parse(req.params);
    const body = updateShopItemInput.parse(req.body);
    const updated = await prisma.shopItem.update({
      where: { id: itemId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type ?? null } : {}),
        ...(body.price !== undefined ? { price: body.price ?? null } : {}),
        ...(body.stock !== undefined ? { stock: body.stock ?? null } : {}),
        ...(body.rarity !== undefined ? { rarity: body.rarity ?? null } : {}),
        ...(body.tags !== undefined ? { tagsJson: JSON.stringify(body.tags) } : {}),
      },
    });
    return toShopItemDto(updated);
  });

  app.delete("/:id/shops/:shopId/items/:itemId", async (req, reply) => {
    const { itemId } = itemParams.parse(req.params);
    await prisma.shopItem.delete({ where: { id: itemId } });
    reply.code(204).send();
  });

  // Buy an item on behalf of a party member: deducts the member's gold and
  // decrements the item's stock atomically, then logs the transaction. Wires
  // the Shop widget to the Party Tracker's gold.
  app.post("/:id/shops/:shopId/items/:itemId/purchase", async (req) => {
    const { id, shopId, itemId } = itemParams.parse(req.params);
    const { memberId, quantity } = purchaseShopItemInput.parse(req.body);

    const fail = (status: number, message: string) => {
      const err = new Error(message) as Error & { statusCode: number };
      err.statusCode = status;
      return err;
    };

    const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item || item.shopId !== shopId) throw fail(404, "Item not found.");
    const member = await prisma.partyMember.findUnique({ where: { id: memberId } });
    if (!member || member.campaignId !== id) throw fail(404, "Party member not found.");

    const calc = resolvePurchase({
      price: item.price,
      stock: item.stock,
      gold: member.gold,
      quantity,
    });
    if (!calc.ok) throw fail(calc.status, calc.message);

    const [updatedItem, updatedMember] = await prisma.$transaction([
      prisma.shopItem.update({
        where: { id: itemId },
        data: calc.newStock !== null ? { stock: calc.newStock } : {},
      }),
      prisma.partyMember.update({
        where: { id: memberId },
        data: { gold: calc.newGold },
      }),
    ]);

    const memberDto = toPartyDto(updatedMember);
    app.bus.emit(id, {
      type: "party.update",
      campaignId: id,
      broadcastKey: "party",
      payload: { member: memberDto },
    });
    await writeLog(
      app,
      id,
      "shop.purchase",
      `${memberDto.name} bought ${quantity}× ${item.name} for ${calc.total}g`,
      { memberId, itemId, quantity, total: calc.total },
    );
    return { member: memberDto, item: toShopItemDto(updatedItem) };
  });

  app.post("/:id/shops/generate", async (req, reply) => {
    const { id } = cidParams.parse(req.params);
    const body = generateShopInput.parse(req.body ?? {});
    const gen = generateShop(body);
    const created = await prisma.shop.create({
      data: {
        campaignId: id,
        name: gen.name,
        notes: gen.notes,
        items: {
          create: gen.items.map((i) => ({
            name: i.name,
            type: i.type ?? null,
            price: i.price ?? null,
            stock: i.stock ?? null,
            rarity: i.rarity ?? null,
            tagsJson: JSON.stringify(i.tags ?? []),
          })),
        },
      },
      include: { items: true },
    });
    await writeLog(
      app,
      id,
      "shop.generate",
      `Generated shop "${created.name}" with ${gen.items.length} items`,
    );
    reply.code(201);
    return toShopDto(created);
  });
};
