import { describe, it, expect } from "vitest";
import { fmtPrice, rarityColor } from "../../../src/modules/shop/constants.js";

describe("fmtPrice", () => {
  it("renders an em dash for unset prices", () => {
    expect(fmtPrice(null)).toBe("—");
    expect(fmtPrice(undefined)).toBe("—");
  });

  it("renders whole numbers without decimals (including zero/free)", () => {
    expect(fmtPrice(0)).toBe("0");
    expect(fmtPrice(10)).toBe("10");
  });

  it("renders fractional prices with two decimals", () => {
    expect(fmtPrice(2.5)).toBe("2.50");
    expect(fmtPrice(2.539)).toBe("2.54");
  });
});

describe("rarityColor", () => {
  it("maps each known rarity to its accent classes", () => {
    expect(rarityColor("uncommon")).toBe("border-l-emerald-500 text-emerald-300");
    expect(rarityColor("rare")).toBe("border-l-sky-500 text-sky-300");
    expect(rarityColor("very rare")).toBe("border-l-violet-500 text-violet-300");
    expect(rarityColor("legendary")).toBe("border-l-amber-500 text-amber-300");
    expect(rarityColor("common")).toBe("border-l-ink-500 text-ink-300");
  });

  it("is case-insensitive", () => {
    expect(rarityColor("RARE")).toBe("border-l-sky-500 text-sky-300");
  });

  it("falls back to a neutral accent for unset or unknown rarities", () => {
    const neutral = "border-l-transparent text-ink-300";
    expect(rarityColor(null)).toBe(neutral);
    expect(rarityColor(undefined)).toBe(neutral);
    expect(rarityColor("mythic")).toBe(neutral);
  });
});
