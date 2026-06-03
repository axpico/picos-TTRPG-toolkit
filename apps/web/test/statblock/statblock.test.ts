import { describe, it, expect } from "vitest";
import { abilityMod, formatMod, emptyStatBlock, statBlock } from "@toolkit/shared";

describe("abilityMod", () => {
  it("computes D&D modifiers", () => {
    expect(abilityMod(10)).toBe(0);
    expect(abilityMod(11)).toBe(0);
    expect(abilityMod(12)).toBe(1);
    expect(abilityMod(8)).toBe(-1);
    expect(abilityMod(20)).toBe(5);
    expect(abilityMod(1)).toBe(-5);
  });

  it("returns null for an unknown score", () => {
    expect(abilityMod(null)).toBe(null);
    expect(abilityMod(undefined)).toBe(null);
  });
});

describe("formatMod", () => {
  it("signs the modifier", () => {
    expect(formatMod(0)).toBe("+0");
    expect(formatMod(3)).toBe("+3");
    expect(formatMod(-2)).toBe("-2");
    expect(formatMod(null)).toBe("—");
  });
});

describe("emptyStatBlock / lenient parse", () => {
  it("produces a fully-defaulted block", () => {
    const s = emptyStatBlock();
    expect(s.ac).toBe(null);
    expect(s.abilities.str).toBe(null);
    expect(s.actions).toEqual([]);
  });

  it("parses partial input, defaulting the rest", () => {
    const s = statBlock.parse({ ac: 15, abilities: { str: 16 } });
    expect(s.ac).toBe(15);
    expect(s.abilities.str).toBe(16);
    expect(s.abilities.dex).toBe(null);
    expect(s.hp).toBe(null);
    expect(s.traits).toEqual([]);
  });
});
