import { useEffect, useState } from "react";
import clsx from "clsx";
import { DEFAULT_WEATHER_TABLE, WEATHER_PRESETS, weatherIcon, type WeatherTableEntry } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { Skeleton } from "../../components/Skeleton.js";
import { PendingButton } from "../shared.js";
import { useRollWeather, useSetWeather, useWeather } from "./api.js";

const TEMPERATURES = ["Freezing", "Cold", "Cool", "Mild", "Warm", "Hot"] as const;

type CurrentPatch = Partial<{ condition: string; temperature: string; description: string }>;

function WeatherWidget({ campaignId }: WidgetContext) {
  const data = useWeather(campaignId);
  const set = useSetWeather(campaignId);
  const roll = useRollWeather(campaignId);
  const [showTable, setShowTable] = useState(false);
  const [condition, setCondition] = useState("");
  const [temperature, setTemperature] = useState("");
  const [description, setDescription] = useState("");
  const [table, setTable] = useState<WeatherTableEntry[]>([]);

  useEffect(() => {
    if (data.data) {
      setCondition(data.data.current.condition);
      setTemperature(data.data.current.temperature);
      setDescription(data.data.current.description);
      setTable(data.data.table ?? []);
    }
  }, [data.data]);

  if (!data.data) {
    return (
      <div className="space-y-2 p-3" aria-hidden="true">
        <Skeleton className="h-20" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  const current = data.data.current;

  /** Save the current weather, merging an optional patch; no-ops when unchanged. */
  const commitCurrent = (patch: CurrentPatch = {}) => {
    const next = { condition, temperature, description, ...patch };
    setCondition(next.condition);
    setTemperature(next.temperature);
    setDescription(next.description);
    if (
      next.condition === current.condition &&
      next.temperature === current.temperature &&
      next.description === current.description
    ) {
      return;
    }
    set.mutate({ current: next });
  };

  // --- Roll table (auto-saves; blank/incomplete rows are kept as drafts) ---
  const totalWeight = table.reduce((s, r) => s + (r.weight || 0), 0);
  const persistTable = (rows: WeatherTableEntry[]) => {
    const complete = rows.filter(
      (r) => r.condition.trim() && r.temperature.trim() && r.description.trim(),
    );
    set.mutate({ table: complete.length ? complete : null });
  };
  const editRow = (idx: number, patch: Partial<WeatherTableEntry>) =>
    setTable((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const commitRowWeight = (idx: number, weight: number) => {
    const next = table.map((r, i) => (i === idx ? { ...r, weight: Math.max(1, weight || 1) } : r));
    setTable(next);
    persistTable(next);
  };
  const removeRow = (idx: number) => {
    const next = table.filter((_, i) => i !== idx);
    setTable(next);
    persistTable(next);
  };
  const appendRows = (rows: WeatherTableEntry[]) => {
    const next = [...table, ...rows];
    setTable(next);
    persistTable(next);
  };
  /** Seed the editor with a copy of the built-in table so the GM can tweak it. */
  const customizeDefault = () => appendRows(DEFAULT_WEATHER_TABLE.map((r) => ({ ...r })));

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Current weather */}
      <div className="space-y-2 border-b border-ink-700 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-ink-400">Currently</span>
          {set.isPending && <span className="text-xs text-ink-400">Saving…</span>}
        </div>

        <div className="flex items-start gap-2.5">
          <span className="text-4xl leading-none" title={condition || "Unknown"}>
            {weatherIcon(condition)}
          </span>
          <div className="flex-1 space-y-1.5">
            <input
              className="input text-lg font-semibold"
              placeholder="Condition (e.g. Rain)"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              onBlur={() => commitCurrent()}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
            <input
              className="input text-sm"
              placeholder="Temperature"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              onBlur={() => commitCurrent()}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
            <div className="flex flex-wrap gap-1">
              {TEMPERATURES.map((t) => (
                <button
                  key={t}
                  className={clsx(
                    "rounded-full border px-2 py-0.5 text-xs transition-colors",
                    temperature.trim().toLowerCase() === t.toLowerCase()
                      ? "border-accent-500 bg-accent-500/15 text-accent-300"
                      : "border-ink-700 text-ink-400 hover:bg-ink-800",
                  )}
                  onClick={() => commitCurrent({ temperature: t })}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <textarea
          className="input min-h-[52px] text-sm"
          placeholder="Describe the scene (optional)…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => commitCurrent()}
        />
      </div>

      {/* Quick-set presets */}
      <div className="border-b border-ink-700 p-3">
        <div className="mb-1.5 text-xs uppercase tracking-wide text-ink-400">Quick set</div>
        <div className="grid grid-cols-2 gap-1">
          {WEATHER_PRESETS.map((p) => {
            const active = condition.trim().toLowerCase() === p.condition.toLowerCase();
            return (
              <button
                key={p.condition}
                title={`${p.condition} — ${p.temperature}`}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1 text-left text-sm transition-colors",
                  active
                    ? "border-accent-500 bg-accent-500/10"
                    : "border-ink-700 hover:bg-ink-800",
                )}
                onClick={() =>
                  commitCurrent({
                    condition: p.condition,
                    temperature: p.temperature,
                    description: p.description,
                  })
                }
              >
                <span className="text-base leading-none">{p.icon}</span>
                <span className="truncate">{p.condition}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 border-b border-ink-700 p-3">
        <PendingButton className="btn-primary" onClick={() => roll.mutate()} pending={roll.isPending}>
          🎲 Roll new weather
        </PendingButton>
        <button className="btn-ghost ml-auto" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Hide roll table" : "Edit roll table"}
        </button>
      </div>

      {/* Roll table editor */}
      {showTable && (
        <div className="space-y-2 p-3">
          <p className="text-xs text-ink-400">
            Weighted options for <span className="text-ink-300">Roll new weather</span>. Higher weight =
            more likely. Changes save automatically; blank rows are ignored.
          </p>

          {table.length === 0 ? (
            <div className="space-y-2 rounded-md border border-dashed border-ink-700 px-3 py-4 text-center text-sm text-ink-400">
              <p>No custom table — rolls use the built-in default.</p>
              <button
                className="btn-ghost h-7 text-xs text-accent-400 hover:text-accent-300"
                onClick={customizeDefault}
                title="Copy the built-in table here so you can tweak weights and add conditions"
              >
                ✎ Customize the default table
              </button>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {table.map((row, idx) => {
                const complete =
                  row.condition.trim() && row.temperature.trim() && row.description.trim();
                const pct = totalWeight > 0 ? Math.round((row.weight / totalWeight) * 100) : 0;
                return (
                  <li
                    key={idx}
                    className={clsx(
                      "rounded-md border p-1.5",
                      complete ? "border-ink-700 bg-ink-900" : "border-amber-500/30 bg-amber-500/5",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 text-center text-lg leading-none" title={row.condition}>
                        {weatherIcon(row.condition)}
                      </span>
                      <input
                        className="input flex-1 text-sm font-medium"
                        placeholder="Condition"
                        value={row.condition}
                        onChange={(e) => editRow(idx, { condition: e.target.value })}
                        onBlur={() => persistTable(table)}
                      />
                      <input
                        type="number"
                        className="input w-12 text-center font-mono text-xs"
                        min={1}
                        value={row.weight}
                        onChange={(e) => commitRowWeight(idx, Number(e.target.value))}
                        title="Relative weight"
                      />
                      <span className="w-9 shrink-0 text-right text-xs text-ink-400" title="Chance">
                        {complete ? `${pct}%` : "—"}
                      </span>
                      <button
                        className="btn-ghost h-7 px-1.5 text-xs text-ink-400 hover:text-accent-400 disabled:opacity-40"
                        disabled={!complete}
                        onClick={() =>
                          commitCurrent({
                            condition: row.condition,
                            temperature: row.temperature,
                            description: row.description,
                          })
                        }
                        title="Make this the current weather"
                        aria-label={`Set ${row.condition || "row"} as current weather`}
                      >
                        ↑ Now
                      </button>
                      <button
                        className="btn-ghost h-7 px-2 text-ink-400 hover:text-red-400"
                        onClick={() => removeRow(idx)}
                        title="Remove row"
                        aria-label="Remove weather row"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 pl-7">
                      <input
                        className="input w-28 text-xs"
                        placeholder="Temperature"
                        value={row.temperature}
                        onChange={(e) => editRow(idx, { temperature: e.target.value })}
                        onBlur={() => persistTable(table)}
                      />
                      <input
                        className="input flex-1 text-xs"
                        placeholder="Description"
                        value={row.description}
                        onChange={(e) => editRow(idx, { description: e.target.value })}
                        onBlur={() => persistTable(table)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Quick-add a preset as a roll-table row (weight 1, then tweak). */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-ink-500">Quick add:</span>
            {WEATHER_PRESETS.map((p) => (
              <button
                key={p.condition}
                className="btn-ghost h-7 px-1.5 text-base leading-none"
                onClick={() =>
                  appendRows([
                    {
                      weight: 1,
                      condition: p.condition,
                      temperature: p.temperature,
                      description: p.description,
                    },
                  ])
                }
                title={`Add "${p.condition}" to the table`}
                aria-label={`Add ${p.condition} to the table`}
              >
                {p.icon}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              className="btn-ghost h-7 text-xs"
              onClick={() =>
                setTable((prev) => [
                  ...prev,
                  { weight: 1, condition: "", temperature: "", description: "" },
                ])
              }
            >
              + Custom row
            </button>
            {table.length > 0 && (
              <button
                className="btn-ghost h-7 text-xs text-ink-400 hover:text-red-400"
                onClick={() => {
                  setTable([]);
                  set.mutate({ table: null });
                }}
                title="Clear the custom table and use the default"
              >
                Reset to default
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

registerWidget({
  type: "weather",
  title: "Weather",
  defaultSize: { w: 360, h: 360 },
  broadcastKey: "weather",
  Component: WeatherWidget,
});

export {};
