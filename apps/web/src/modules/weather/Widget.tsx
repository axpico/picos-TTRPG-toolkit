import { useEffect, useState } from "react";
import type { WeatherTableEntry } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useRollWeather, useSetWeather, useWeather } from "./api.js";

function WeatherWidget({ campaignId }: WidgetContext) {
  const data = useWeather(campaignId);
  const set = useSetWeather(campaignId);
  const roll = useRollWeather(campaignId);
  const [editing, setEditing] = useState(false);
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

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-700 p-3">
        <div className="text-xs uppercase tracking-wide text-ink-400">Currently</div>
        <div className="mt-1 text-lg font-semibold">{data.data.current.condition}</div>
        <div className="text-sm text-ink-300">{data.data.current.temperature}</div>
        <p className="mt-1 text-sm text-ink-200">{data.data.current.description}</p>
        <div className="mt-2 flex gap-1">
          <button
            className="btn-primary"
            onClick={() => roll.mutate()}
            disabled={roll.isPending}
          >
            Roll new weather
          </button>
          <button className="btn-ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="space-y-2 overflow-auto p-3 text-sm">
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-400">Current</label>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <input
                className="input"
                placeholder="Condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              />
              <input
                className="input"
                placeholder="Temperature"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>
            <textarea
              className="input mt-1 min-h-[60px]"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button
              className="btn-primary mt-1"
              onClick={() =>
                set.mutate(
                  { current: { condition, temperature, description } },
                  { onSuccess: () => setEditing(false) },
                )
              }
            >
              Save current
            </button>
          </div>

          <hr className="my-1 border-ink-700" />

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
                onClick={() =>
                  set.mutate(
                    { table: table.length ? table : null },
                    { onSuccess: () => setEditing(false) },
                  )
                }
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
