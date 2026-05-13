import { useEffect, useState } from "react";
import type { CalendarDefinition } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useAdvanceCalendar, useCalendar, useSetCalendar } from "./api.js";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDate(def: CalendarDefinition, y: number, mo: number, d: number) {
  const name = def.monthNames[mo - 1] ?? `Month ${mo}`;
  return `${d} ${name} ${y}`;
}

function CalendarWidget({ campaignId }: WidgetContext) {
  const data = useCalendar(campaignId);
  const set = useSetCalendar(campaignId);
  const advance = useAdvanceCalendar(campaignId);
  const [editingDef, setEditingDef] = useState(false);
  const [defText, setDefText] = useState("");
  const [defErr, setDefErr] = useState<string | null>(null);

  useEffect(() => {
    if (data.data) setDefText(JSON.stringify(data.data.definition, null, 2));
  }, [data.data]);

  if (!data.data) {
    return <div className="p-3 text-sm text-ink-400">Loading…</div>;
  }

  const c = data.data;
  const def = c.definition;

  const commitDef = () => {
    try {
      const parsed = JSON.parse(defText);
      set.mutate(
        { definition: parsed },
        {
          onSuccess: () => {
            setEditingDef(false);
            setDefErr(null);
          },
          onError: (e) => setDefErr(e instanceof Error ? e.message : "Invalid"),
        },
      );
    } catch (e) {
      setDefErr(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-700 p-3">
        <div className="text-xs uppercase tracking-wide text-ink-400">In-world time</div>
        <div className="mt-1 text-lg font-semibold">
          {formatDate(def, c.currentYear, c.currentMonth, c.currentDay)}
        </div>
        <div className="font-mono text-sm text-ink-300">
          {pad(c.currentHour)}:{pad(c.currentMinute)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-3 text-sm">
        <button
          className="btn-ghost"
          onClick={() => advance.mutate({ rounds: 1 })}
          disabled={advance.isPending}
        >
          +1 round
        </button>
        <button className="btn-ghost" onClick={() => advance.mutate({ minutes: 10 })}>
          +10 min
        </button>
        <button className="btn-ghost" onClick={() => advance.mutate({ hours: 1 })}>
          +1 hour
        </button>
        <button className="btn-ghost" onClick={() => advance.mutate({ hours: 8 })}>
          +8 hours
        </button>
        <button className="btn-ghost" onClick={() => advance.mutate({ days: 1 })}>
          +1 day
        </button>
        <button className="btn-ghost" onClick={() => advance.mutate({ days: 7 })}>
          +1 week
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 border-t border-ink-700 p-3 text-sm">
        <label className="flex items-center gap-1 text-xs text-ink-400">
          Year
          <input
            type="number"
            className="input"
            value={c.currentYear}
            onChange={(e) => set.mutate({ currentYear: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-ink-400">
          Month
          <select
            className="input"
            value={c.currentMonth}
            onChange={(e) => set.mutate({ currentMonth: Number(e.target.value) })}
          >
            {def.monthNames.map((m, idx) => (
              <option key={idx} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs text-ink-400">
          Day
          <input
            type="number"
            className="input"
            min={1}
            max={def.daysPerMonth[c.currentMonth - 1] ?? 30}
            value={c.currentDay}
            onChange={(e) => set.mutate({ currentDay: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-ink-400">
          Hour
          <input
            type="number"
            className="input"
            min={0}
            max={def.hoursPerDay - 1}
            value={c.currentHour}
            onChange={(e) => set.mutate({ currentHour: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="border-t border-ink-700 p-3">
        <button
          className="btn-ghost text-xs"
          onClick={() => setEditingDef((v) => !v)}
        >
          {editingDef ? "Cancel" : "Edit calendar definition"}
        </button>
        {editingDef && (
          <div className="mt-2 space-y-1">
            <textarea
              className="input min-h-[140px] font-mono text-xs"
              value={defText}
              onChange={(e) => setDefText(e.target.value)}
            />
            {defErr && <div className="text-xs text-red-400">{defErr}</div>}
            <button className="btn-primary" onClick={commitDef}>
              Save definition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: "calendar",
  title: "Calendar & Time",
  defaultSize: { w: 400, h: 440 },
  broadcastKey: "calendar",
  Component: CalendarWidget,
});

export {};
