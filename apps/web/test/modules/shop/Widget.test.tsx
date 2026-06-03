import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/shop/api.js", () => ({
  useShops: () => ({ data: [] }),
  useCreateShop: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateShop: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteShop: () => ({ mutate: vi.fn(), isPending: false }),
  useGenerateShop: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateShopItem: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateShopItem: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteShopItem: () => ({ mutate: vi.fn(), isPending: false }),
}));

await import("../../../src/modules/shop/Widget.js");
const ShopWidget = getWidget("shop")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("ShopWidget", () => {
  it("offers the generator when no shop exists", () => {
    render(<ShopWidget {...ctx} />);
    expect(screen.getByRole("button", { name: "Generate" })).toBeTruthy();
  });
});
