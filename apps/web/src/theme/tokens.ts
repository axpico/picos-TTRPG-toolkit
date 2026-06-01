import type { ThemePreset } from "./presets.js";

/** Ink ramp keys in the exact order Tailwind expects, low (text) → high (surface). */
export const INK_KEYS = [
  "50", "100", "200", "300", "400", "500", "600", "700", "800", "850", "900", "950",
] as const;

export const ACCENT_KEYS = ["500", "600", "700"] as const;

/** A map of CSS custom-property name → value, applied to the document root. */
export type ThemeVars = Record<string, string>;

/**
 * Resolve a preset (with an optional partial override) into the CSS variables
 * the Tailwind config reads. Colors are space-separated "R G B" channel triples
 * so Tailwind's `<alpha-value>` opacity utilities keep working. The override is
 * merged last, letting a custom theme tweak any subset of variables.
 */
export function presetToVars(preset: ThemePreset, override?: ThemeVars): ThemeVars {
  const vars: ThemeVars = {};
  INK_KEYS.forEach((k, i) => {
    vars[`--ink-${k}`] = preset.tokens.ink[i]!;
  });
  ACCENT_KEYS.forEach((k, i) => {
    vars[`--accent-${k}`] = preset.tokens.accent[i]!;
  });
  vars["--accent-fg"] = preset.tokens.accentFg;
  vars["--font-display"] = preset.fonts.display;
  vars["--font-body"] = preset.fonts.body;
  vars["--font-mono"] = preset.fonts.mono;
  return { ...vars, ...(override ?? {}) };
}

/** Imperatively apply theme variables to an element (defaults to <html>). */
export function applyVars(vars: ThemeVars, el: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(name, value);
  }
}

/** "52 211 166" → "#34d3a6". Returns black for malformed input. */
export function tripleToHex(triple: string): string {
  const parts = triple.trim().split(/\s+/).map((n) => Number(n));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return "#000000";
  return (
    "#" +
    parts
      .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** "#34d3a6" (or "34d3a6") → "52 211 166". Returns "0 0 0" for malformed input. */
export function hexToTriple(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "0 0 0";
  const int = parseInt(m[1]!, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}
