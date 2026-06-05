import { describe, it, expect } from "vitest";
import {
  abilityCheckNotation,
  buildStatBlock,
  initiativeNotation,
  parseAction,
  parseModifierList,
  statBlock,
} from "@toolkit/shared";

describe("parseModifierList", () => {
  it("parses a comma-separated save/skill list", () => {
    expect(parseModifierList("DEX +5, CON +3")).toEqual([
      { name: "DEX", mod: 5, ability: "dex" },
      { name: "CON", mod: 3, ability: "con" },
    ]);
  });

  it("handles negative and unsigned-spaced mods, skips junk", () => {
    expect(parseModifierList("Perception +4; Stealth -1")).toEqual([
      { name: "Perception", mod: 4 },
      { name: "Stealth", mod: -1 },
    ]);
    expect(parseModifierList("")).toEqual([]);
    expect(parseModifierList(null)).toEqual([]);
    expect(parseModifierList("just words")).toEqual([]);
  });
});

describe("parseAction", () => {
  it("extracts to-hit and damage with type", () => {
    const a = parseAction(
      "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 7 (1d8 + 3) slashing damage plus 3 (1d6) fire damage.",
    );
    expect(a.toHit).toBe(5);
    expect(a.damage).toEqual([
      { notation: "1d8+3", type: "slashing" },
      { notation: "1d6", type: "fire" },
    ]);
  });

  it("returns empty for non-attack text", () => {
    expect(parseAction("The creature can breathe air and water.")).toEqual({ damage: [] });
  });
});

describe("notation builders", () => {
  it("builds ability-check notation with proficiency", () => {
    expect(abilityCheckNotation(16)).toBe("1d20+3");
    expect(abilityCheckNotation(16, 2, { proficient: true })).toBe("1d20+5");
    expect(abilityCheckNotation(10)).toBe("1d20");
  });

  it("derives initiative from DEX", () => {
    expect(initiativeNotation(statBlock.parse({ abilities: { dex: 14 } }))).toBe("1d20+2");
    expect(initiativeNotation(statBlock.parse({ abilities: { dex: 10 } }))).toBe("1d20");
  });
});

describe("buildStatBlock", () => {
  it("produces a consistent block that round-trips through the schema", () => {
    const s = buildStatBlock({ kind: "beast", crOrLevel: "5", archetype: "brute" });
    expect(() => statBlock.parse(s)).not.toThrow();
    expect(s.ac).toBeGreaterThan(0);
    expect(s.hp).toBe(s.hpMax);
    expect(s.actions).toHaveLength(1);
    // Brute leads with STR, so STR should be the highest score.
    const max = Math.max(...Object.values(s.abilities).map((v) => v ?? 0));
    expect(s.abilities.str).toBe(max);
    expect(s.cr).toBe("5");
  });

  it("uses level (not CR) for player/npc kinds", () => {
    const s = buildStatBlock({ kind: "player", crOrLevel: 3, archetype: "caster" });
    expect(s.level).toBe(3);
    expect(s.cr).toBe(null);
  });
});
