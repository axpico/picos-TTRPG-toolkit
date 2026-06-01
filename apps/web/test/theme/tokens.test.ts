import { describe, it, expect } from "vitest";
import { presetToVars, tripleToHex, hexToTriple, INK_KEYS } from "../../src/theme/tokens.js";
import { getPreset } from "../../src/theme/presets.js";

describe("presetToVars", () => {
  const preset = getPreset("midnight");

  it("maps every ink stop to the Tailwind-expected --ink-<k> variable", () => {
    const vars = presetToVars(preset);
    INK_KEYS.forEach((k, i) => {
      expect(vars[`--ink-${k}`]).toBe(preset.tokens.ink[i]);
    });
  });

  it("includes accent stops, accent-fg, and the three font vars", () => {
    const vars = presetToVars(preset);
    expect(vars["--accent-500"]).toBe(preset.tokens.accent[0]);
    expect(vars["--accent-fg"]).toBe(preset.tokens.accentFg);
    expect(vars["--font-display"]).toBe(preset.fonts.display);
    expect(vars["--font-body"]).toBe(preset.fonts.body);
  });

  it("merges a partial override over the base preset", () => {
    const vars = presetToVars(preset, { "--accent-600": "1 2 3" });
    expect(vars["--accent-600"]).toBe("1 2 3");
    // untouched vars still come from the preset
    expect(vars["--ink-950"]).toBe(preset.tokens.ink[11]);
  });
});

describe("hex <-> triple", () => {
  it("converts a triple to hex", () => {
    expect(tripleToHex("52 211 166")).toBe("#34d3a6");
  });

  it("converts hex back to a triple (round-trip)", () => {
    expect(hexToTriple("#34d3a6")).toBe("52 211 166");
    expect(hexToTriple("34d3a6")).toBe("52 211 166");
  });

  it("returns safe fallbacks for malformed input", () => {
    expect(tripleToHex("garbage")).toBe("#000000");
    expect(hexToTriple("nope")).toBe("0 0 0");
  });
});
