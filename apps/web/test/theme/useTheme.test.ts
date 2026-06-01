import { describe, it, expect, beforeEach } from "vitest";
import { useTheme, loadSelection } from "../../src/theme/useTheme.js";
import { getPreset } from "../../src/theme/presets.js";

beforeEach(() => {
  localStorage.clear();
  useTheme.getState().reset();
});

const cssVar = (name: string) => document.documentElement.style.getPropertyValue(name).trim();

describe("useTheme store", () => {
  it("setPreset updates state, applies vars to <html>, and tags the mode", () => {
    useTheme.getState().setPreset("arcane");
    const arcane = getPreset("arcane");
    expect(useTheme.getState().presetId).toBe("arcane");
    expect(cssVar("--ink-950")).toBe(arcane.tokens.ink[11]);
    expect(document.documentElement.dataset.theme).toBe("arcane");
    expect(document.documentElement.dataset.mode).toBe(arcane.mode);
  });

  it("persists the selection so it rehydrates from localStorage", () => {
    useTheme.getState().setPreset("noir");
    expect(loadSelection()).toEqual({ presetId: "noir", custom: null });
  });

  it("setCustomVar records the override and applies it live", () => {
    useTheme.getState().setCustomVar("--accent-600", "10 20 30");
    expect(useTheme.getState().custom).toEqual({ "--accent-600": "10 20 30" });
    expect(cssVar("--accent-600")).toBe("10 20 30");
    // persisted custom rehydrates too
    expect(loadSelection().custom).toEqual({ "--accent-600": "10 20 30" });
  });

  it("clearCustom drops overrides but keeps the preset", () => {
    useTheme.getState().setPreset("tactical");
    useTheme.getState().setCustomVar("--ink-50", "1 1 1");
    useTheme.getState().clearCustom();
    expect(useTheme.getState().custom).toBeNull();
    expect(useTheme.getState().presetId).toBe("tactical");
  });

  it("reset returns to the default preset", () => {
    useTheme.getState().setPreset("cartographer");
    useTheme.getState().reset();
    expect(useTheme.getState().presetId).toBe("midnight");
  });
});
