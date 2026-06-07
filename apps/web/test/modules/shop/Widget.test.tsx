import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

const h = vi.hoisted(() => ({
  purchaseMutate: vi.fn(),
  shops: { data: [] as unknown[] },
}));

vi.mock("../../../src/modules/shop/api.js", () => ({
  useShops: () => h.shops,
  useCreateShop: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateShop: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteShop: () => ({ mutate: vi.fn(), isPending: false }),
  useGenerateShop: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateShopItem: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateShopItem: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteShopItem: () => ({ mutate: vi.fn(), isPending: false }),
  usePurchaseItem: () => ({ mutate: h.purchaseMutate, isPending: false }),
}));

vi.mock("../../../src/modules/party/api.js", () => ({
  useParty: () => ({
    data: [{ id: "m1", name: "Aria", gold: 50, conditions: [], status: "active", stats: {} }],
  }),
}));

vi.mock("../../../src/modules/broadcast/api.js", () => ({
  useBroadcasts: () => ({ data: [] }),
  useSetBroadcast: () => ({ mutate: vi.fn(), isPending: false }),
  useSetBroadcasts: () => ({ mutate: vi.fn(), isPending: false }),
  useWidgetBroadcast: () => ({ active: false, payload: {}, share: vi.fn(), stop: vi.fn(), isPending: false }),
  usePresence: () => ({ data: { count: 0 } }),
}));

vi.mock("../../../src/components/Toast.js", () => ({ useToast: () => () => {} }));
vi.mock("../../../src/components/ConfirmDialog.js", () => ({
  useConfirm: () => () => Promise.resolve(true),
}));

await import("../../../src/modules/shop/Widget.js");
const ShopWidget = getWidget("shop")!.Component;

const SHOP = {
  id: "s1",
  campaignId: "camp",
  name: "Emporium",
  notes: null,
  items: [
    { id: "i1", shopId: "s1", name: "Potion", type: "gear", price: 10, stock: 5, rarity: "common", tags: [] },
    { id: "i2", shopId: "s1", name: "Sword", type: "weapon", price: 100, stock: 1, rarity: "rare", tags: [] },
  ],
};

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

beforeEach(() => {
  vi.clearAllMocks();
  h.shops.data = [];
});
afterEach(cleanup);

describe("ShopWidget", () => {
  it("registers without a fixed broadcast key so instances share independently", () => {
    // Each Shop widget falls back to a per-instance `shop:${instanceId}` key.
    expect(getWidget("shop")!.broadcastKey).toBeUndefined();
  });

  it("offers the generator when no shop exists", () => {
    render(<ShopWidget {...ctx} />);
    expect(screen.getByRole("button", { name: "Generate" })).toBeTruthy();
  });

  it("disables Buy until a buyer is selected", () => {
    h.shops.data = [SHOP];
    render(<ShopWidget {...ctx} />);
    const buys = screen.getAllByRole("button", { name: "Buy" }) as HTMLButtonElement[];
    expect(buys).toHaveLength(2);
    expect(buys.every((b) => b.disabled)).toBe(true);
  });

  it("enables Buy only for affordable, in-stock items once a buyer is chosen", () => {
    h.shops.data = [SHOP];
    render(<ShopWidget {...ctx} />);
    // Comboboxes in order: [shop selector, buyer selector]. Pick the buyer.
    const buyerSelect = screen.getAllByRole("combobox")[1]!;
    fireEvent.change(buyerSelect, { target: { value: "m1" } });
    const buys = screen.getAllByRole("button", { name: "Buy" }) as HTMLButtonElement[];
    expect(buys[0]!.disabled).toBe(false); // Potion: 10g, affordable
    expect(buys[1]!.disabled).toBe(true); // Sword: 100g, can't afford on 50g
  });

  it("buys an item on behalf of the selected party member", () => {
    h.shops.data = [SHOP];
    render(<ShopWidget {...ctx} />);
    const buyerSelect = screen.getAllByRole("combobox")[1]!;
    fireEvent.change(buyerSelect, { target: { value: "m1" } });
    fireEvent.click((screen.getAllByRole("button", { name: "Buy" })[0]!));
    expect(h.purchaseMutate.mock.calls[0]![0]).toEqual({
      shopId: "s1",
      itemId: "i1",
      input: { memberId: "m1", quantity: 1 },
    });
  });
});
