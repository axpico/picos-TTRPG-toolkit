import { useEffect, useState } from "react";
import { WEATHER_PRESETS, weatherIcon, type WeatherTableEntry } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useRollWeather, useSetWeather, useWeather } from "./api.js";

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
    return <div className="p-3 text-sm text-ink-400">Loading…</div>;
  }

  const current = data.data.current;

  // Save the current weather, but only when something actually changed so a
  // stray blur doesn't fire a needless request.
  const saveCurrent = () => {
    if (
      condition === current.condition &&
      temperature === current.temperature &&
      description === current.description
    ) {
      return;
    }
    set.mutate({ current: { condition, temperature, description } });
  };

  const applyPreset = (p: (typeof WEATHER_PRESETS)[number]) => {
    setCondition(p.condition);
    setTemperature(p.temperature);
    setDescription(p.description);
    set.mutate({
      current: { condition: p.condition, temperature: p.temperature, description: p.description },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-700 p-3">
        <div className="text-xs uppercase tracking-wide text-ink-400">Currently</div>

        {/* Inline-editable current weather */}
        <div className="mt-1 flex items-start gap-2">
          <span className="mt-1 text-3xl leading-none" title={condition}>
            {weatherIcon(condition)}
          </span>
          <div className="flex-1 space-y-1">
            <input
              className="input text-lg font-semibold"
              placeholder="Condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              onBlur={saveCurrent}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
            <input
              className="input text-sm"
              placeholder="Temperature"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              onBlur={saveCurrent}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </div>
        </div>
        <textarea
          className="input mt-1 min-h-[52px] text-sm"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveCurrent}
        />

        {/* Quick-set presets */}
        <div className="mt-2 flex flex-wrap gap-1">
          {WEATHER_PRESETS.map((p) => (
            <button
              key={p.condition}
              className="btn-ghost h-7 px-1.5 text-sm"
              title={`${p.condition} — ${p.temperature}`}
              onClick={() => applyPreset(p)}
            >
              {p.icon}
            </button>
          ))}
        </div>

        <div className="mt-2 flex gap-1">
          <button
            className="btn-primary"
            onClick={() => roll.mutate()}
            disabled={roll.isPending}
          >
            Roll new weather
          </button>
          <button className="btn-ghost" onClick={() => setShowTable((v) => !v)}>
            {showTable ? "Hide roll table" : "Roll table…"}
          </button>
        </div>
      </div>

      {showTable && (
        <div className="space-y-2 overflow-auto p-3 text-sm">
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-400">
              Weather table (used by "Roll new weather")
            </label>
            <ul className="mt-1 space-y-1">
              {table.map((row, idx) => (
                <li key={idx} className="grid grid-cols-12 items-center gap-1">
                  <input
                    type="number"
                    className="input col-span-2 text-right"
                    min={1}
                    value={row.weight}
                    onChange={(e) => {
                      const next = [...table];
                      next[idx] = { ...row, weight: Math.max(1, Number(e.target.value) || 1) };
                      setTable(next);
                    }}
                  />
                  <input
                    className="input col-span-3"
                    placeholder="Condition"
                    value={row.condition}
                    onChange={(e) => {
                      const next = [...table];
                      next[idx] = { ...row, condition: e.target.value };
                      setTable(next);
                    }}
                  />
                  <input
                    className="input col-span-3"
                    placeholder="Temp"
                    value={row.temperature}
                    onChange={(e) => {
                      const next = [...table];
                      next[idx] = { ...row, temperature: e.target.value };
                      setTable(next);
                    }}
                  />
                  <input
                    className="input col-span-3"
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => {
                      const next = [...table];
                      next[idx] = { ...row, description: e.target.value };
                      setTable(next);
                    }}
                  />
                  <button
                    className="btn-ghost col-span-1 px-2"
                    onClick={() => setTable(table.filter((_, i) => i !== idx))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-1 flex gap-1">
              <button
                className="btn-ghost h-7 text-xs"
                onClick={() =>
                  setTable([
                    ...table,
                    { weight: 1, condition: "", temperature: "", description: "" },
                  ])
                }
              >
                + row
              </button>
              <button
                className="btn-primary"
                onClick={() => set.mutate({ table: table.length ? table : null })}
              >
                Save table
              </button>
              <button
                className="btn-danger"
                onClick={() =>
                  set.mutate({ table: null }, { onSuccess: () => setTable([]) })
                }
              >
                Reset to default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

registerWidget({
  type: "weather",
  title: "Weather",
  defaultSize: { w: 360, h: 320 },
  broadcastKey: "weather",
  Component: WeatherWidget,
});

export {};
