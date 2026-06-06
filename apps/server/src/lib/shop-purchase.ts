/** Pure purchase rules for the Shop → Party gold interaction.
 *
 * Kept dependency-free (no Prisma, no Fastify) so the affordability/stock math
 * can be unit-tested in isolation — the route handler does the DB lookups and
 * the transaction, then delegates the decision to `resolvePurchase`.
 */

export type PurchaseResolution =
  | { ok: true; total: number; newStock: number | null; newGold: number }
  | { ok: false; status: number; message: string };

/**
 * Validate a purchase and compute the resulting balances.
 *
 * - `stock: null` means unlimited stock (never blocks, stays `null`).
 * - `price: null` means the item is free (`total` is 0).
 */
export function resolvePurchase(opts: {
  price: number | null;
  stock: number | null;
  gold: number;
  quantity: number;
}): PurchaseResolution {
  const { price, stock, gold, quantity } = opts;

  if (stock !== null && stock < quantity) {
    return { ok: false, status: 400, message: "Not enough stock." };
  }

  const total = Math.round((price ?? 0) * quantity);
  if (gold < total) {
    return { ok: false, status: 400, message: "Not enough gold." };
  }

  return {
    ok: true,
    total,
    newStock: stock === null ? null : stock - quantity,
    newGold: gold - total,
  };
}
