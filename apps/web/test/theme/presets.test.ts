import { describe, it, expect } from "vitest";
import { PRESETS, getPreset, DEFAULT_PRESET_ID } from "../../src/theme/presets.js";

const isTriple = (s: string) => /^\d{1,3} \d{1,3} \d{1,3}$/.test(s) &&
  s.split(" ").every((n) => Number(n) >= 0 && Number(n) <= 255);

describe("theme presets", () => {
  it("ships several presets with unique ids", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each preset defines a full 12-stop ink ramp and 3 accent stops", () => {
    for (const p of PRESETS) {
      expect(p.tokens.ink).toHaveLength(12);
      expect(p.tokens.accent).toHaveLength(3);
    }
  });

  it("every color is a valid 'R G B' channel triple", () => {
    for (const p of PRESETS) {
      for (const c of [...p.tokens.ink, ...p.tokens.accent, p.tokens.accentFg]) {
        expect(isTriple(c), `${p.id}: "${c}"`).toBe(true);
      }
    }
  });

  it("each preset specifies the three font slots", () => {
    for (const p of PRESETS) {
      expect(p.fonts.display.length).toBeGreaterThan(0);
      expect(p.fonts.body.length).toBeGreaterThan(0);
      expect(p.fonts.mono.length).toBeGreaterThan(0);
    }
  });

  it("getPreset returns the requested preset, or the default for unknown ids", () => {
    expect(getPreset(DEFAULT_PRESET_ID).id).toBe(DEFAULT_PRESET_ID);
    expect(getPreset("nope").id).toBe(PRESETS[0]!.id);
  });
});
