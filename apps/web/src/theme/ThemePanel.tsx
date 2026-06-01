import { useState } from "react";
import clsx from "clsx";
import { Modal } from "../components/Modal.js";
import { FONT_OPTIONS, getPreset } from "./presets.js";
import { presetToVars, tripleToHex, hexToTriple } from "./tokens.js";
import { useTheme } from "./useTheme.js";

const EDITABLE_COLORS: { var: string; label: string }[] = [
  { var: "--ink-950", label: "Background" },
  { var: "--ink-850", label: "Surface" },
  { var: "--ink-700", label: "Border" },
  { var: "--ink-50", label: "Text" },
  { var: "--accent-600", label: "Accent" },
];

const EDITABLE_FONTS: { var: string; label: string }[] = [
  { var: "--font-display", label: "Display font" },
  { var: "--font-body", label: "Body font" },
];

function Swatches({ presetId, custom }: { presetId: string; custom: Record<string, string> | null }) {
  const vars = presetToVars(getPreset(presetId), custom ?? undefined);
  const swatch = (name: string) => ({ backgroundColor: `rgb(${vars[name]})` });
  return (
    <div className="flex items-center gap-1">
      <span className="h-5 w-5 rounded border border-black/20" style={swatch("--ink-950")} />
      <span className="h-5 w-5 rounded border border-black/20" style={swatch("--ink-850")} />
      <span className="h-5 w-5 rounded border border-black/20" style={swatch("--accent-600")} />
      <span className="h-5 w-5 rounded border border-black/20" style={swatch("--ink-50")} />
    </div>
  );
}

export function ThemeControl() {
  const [open, setOpen] = useState(false);
  const { presetId, custom, presets, setPreset, setCustomVar, clearCustom } = useTheme();

  const resolved = presetToVars(getPreset(presetId), custom ?? undefined);

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)} title="Change theme">
        ◐ Theme
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="max-w-lg" labelledBy="theme-title">
        <header className="flex items-center justify-between border-b border-ink-700 px-5 py-3">
          <h2 id="theme-title" className="display text-lg font-semibold">Appearance</h2>
          <button className="btn-ghost h-7 px-2" onClick={() => setOpen(false)} title="Close">×</button>
        </header>

        <div className="space-y-5 p-5">
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">Presets</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={clsx(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                    presetId === p.id && !custom
                      ? "border-accent-500 bg-accent-500/10"
                      : "border-ink-700 bg-ink-900 hover:border-ink-600",
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium" style={{ fontFamily: p.fonts.display }}>
                      {p.label}
                    </span>
                    <span className="text-xs text-ink-500">{p.mode}</span>
                  </span>
                  <Swatches presetId={p.id} custom={null} />
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Customize {custom && <span className="text-accent-500">• edited</span>}
              </h3>
              {custom && (
                <button className="btn-ghost h-6 px-2 text-xs" onClick={clearCustom}>
                  Reset to {getPreset(presetId).label}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {EDITABLE_COLORS.map((c) => (
                <label key={c.var} className="flex items-center gap-2 text-sm">
                  <input
                    type="color"
                    className="h-7 w-9 cursor-pointer rounded border border-ink-700 bg-transparent"
                    value={tripleToHex(resolved[c.var] ?? "0 0 0")}
                    onChange={(e) => setCustomVar(c.var, hexToTriple(e.target.value))}
                  />
                  <span className="text-ink-300">{c.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EDITABLE_FONTS.map((f) => (
                <label key={f.var} className="text-sm">
                  <span className="mb-1 block text-xs text-ink-400">{f.label}</span>
                  <select
                    className="input"
                    value={resolved[f.var] ?? ""}
                    onChange={(e) => setCustomVar(f.var, e.target.value)}
                  >
                    {FONT_OPTIONS.map((o) => (
                      <option key={o.label} value={o.stack}>{o.label}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <p className="text-xs text-ink-500">
            Your choice is saved on this device and applies across the whole app.
          </p>
        </div>
      </Modal>
    </>
  );
}
