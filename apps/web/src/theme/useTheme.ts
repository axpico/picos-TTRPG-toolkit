import { create } from "zustand";
import { DEFAULT_PRESET_ID, getPreset, PRESETS, type ThemePreset } from "./presets.js";
import { applyVars, presetToVars, type ThemeVars } from "./tokens.js";

const SELECTION_KEY = "ttrpg-theme";
const VARS_KEY = "ttrpg-theme-vars";

export interface ThemeSelection {
  presetId: string;
  /** Per-variable overrides on top of the preset (the "Custom" theme). */
  custom: ThemeVars | null;
}

export function loadSelection(): ThemeSelection {
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ThemeSelection;
      if (parsed && typeof parsed.presetId === "string") {
        return { presetId: parsed.presetId, custom: parsed.custom ?? null };
      }
    }
  } catch {
    /* fall through to default */
  }
  return { presetId: DEFAULT_PRESET_ID, custom: null };
}

/** Resolve, apply to <html>, and persist a selection. Returns the resolved vars. */
export function applySelection(sel: ThemeSelection): ThemeVars {
  const preset = getPreset(sel.presetId);
  const vars = presetToVars(preset, sel.custom ?? undefined);
  applyVars(vars);
  const root = document.documentElement;
  root.dataset.theme = preset.id;
  root.dataset.mode = preset.mode;
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(sel));
    localStorage.setItem(VARS_KEY, JSON.stringify(vars));
  } catch {
    /* persistence is best-effort */
  }
  return vars;
}

interface ThemeState extends ThemeSelection {
  presets: ThemePreset[];
  setPreset: (id: string) => void;
  setCustomVar: (name: string, value: string) => void;
  clearCustom: () => void;
  reset: () => void;
}

export const useTheme = create<ThemeState>((set, get) => {
  const initial = loadSelection();
  return {
    presetId: initial.presetId,
    custom: initial.custom,
    presets: PRESETS,

    setPreset: (id) => {
      applySelection({ presetId: id, custom: null });
      set({ presetId: id, custom: null });
    },

    setCustomVar: (name, value) => {
      const custom = { ...(get().custom ?? {}), [name]: value };
      applySelection({ presetId: get().presetId, custom });
      set({ custom });
    },

    clearCustom: () => {
      applySelection({ presetId: get().presetId, custom: null });
      set({ custom: null });
    },

    reset: () => {
      applySelection({ presetId: DEFAULT_PRESET_ID, custom: null });
      set({ presetId: DEFAULT_PRESET_ID, custom: null });
    },
  };
});

/** Re-apply the selected theme on mount (idempotent with the pre-paint script). */
export function initTheme(): void {
  const { presetId, custom } = useTheme.getState();
  applySelection({ presetId, custom });
}
