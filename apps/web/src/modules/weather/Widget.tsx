import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  DEFAULT_WEATHER_TABLE,
  WEATHER_PRESETS,
  weatherIcon,
  type Weather,
  type WeatherPreset,
  type WeatherState,
  type WeatherTableEntry,
} from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useWidgetState } from "../../canvas/useWidgetState.js";
import { Skeleton } from "../../components/Skeleton.js";
import { PendingButton, Tabs } from "../shared.js";
import { useRollWeather, useSetWeather, useWeather } from "./api.js";

const TEMPERATURES = ["Freezing", "Cold", "Cool", "Mild", "Warm", "Hot"] as const;

type Tab = "current" | "table";
type CurrentDraft = { condition: string; temperature: string; description: string };
type CurrentPatch = Partial<CurrentDraft>;

/** A table row in the editor: the persisted entry plus a stable client-only key. */
type EditableRow = WeatherTableEntry & { rowId: string };

let rowSeq = 0;
const newRowId = () => `wr-${rowSeq++}`;
const withId = (entry: WeatherTableEntry): EditableRow => ({ ...entry, rowId: newRowId() });
const stripId = ({ rowId: _rowId, ...entry }: EditableRow): WeatherTableEntry => entry;
const isComplete = (r: WeatherTableEntry) =>
  Boolean(r.condition.trim() && r.temperature.trim() && r.description.trim());

const sameCurrent = (a: WeatherState, b: WeatherState) =>
  a.condition === b.condition && a.temperature === b.temperature && a.description === b.description;
const sameEntry = (a: WeatherTableEntry, b: WeatherTableEntry) =>
  a.weight === b.weight &&
  a.condition === b.condition &&
  a.temperature === b.temperature &&
  a.description === b.description;
const sameTable = (a: WeatherTableEntry[], b: WeatherTableEntry[]) =>
  a.length === b.length &&
  a.every((r, i) => {
    const other = b[i];
    return other !== undefined && sameEntry(r, other);
  });

function WeatherWidget({ campaignId, state, setState }: WidgetContext) {
  const [{ tab }, patch] = useWidgetState({ state, setState }, { tab: "current" as Tab });
  const data = useWeather(campaignId);
  const set = useSetWeather(campaignId);
  const roll = useRollWeather(campaignId);

  const [currentDraft, setCurrentDraft] = useState<CurrentDraft>({
    condition: "",
    temperature: "",
    description: "",
  });
  const [rows, setRows] = useState<EditableRow[]>([]);
  const lastServerRef = useRef<Weather | null>(null);
  const draftRef = useRef(currentDraft);
  draftRef.current = currentDraft;

  // Sync server data into the edit state without stomping in-progress edits.
  // Our own saves echo back (cache write + a `weather.update` SSE refetch), so
  // only adopt what genuinely changed server-side since the last sync.
  useEffect(() => {
    const server = data.data;
    if (!server) return;
    const prev = lastServerRef.current;
    lastServerRef.current = server;
    if (!prev) {
      setCurrentDraft({ ...server.current });
      setRows((server.table ?? []).map(withId));
      return;
    }
    setCurrentDraft((draft) => {
      let changed = false;
      const next = { ...draft };
      for (const f of ["condition", "temperature", "description"] as const) {
        if (server.current[f] !== prev.current[f] && server.current[f] !== draft[f]) {
          next[f] = server.current[f];
          changed = true;
        }
      }
      return changed ? next : draft;
    });
    setRows((local) => {
      const serverTable = server.table ?? [];
      // Echo of our own save: keep local rows (preserves ids and draft rows).
      if (sameTable(serverTable, local.filter(isComplete).map(stripId))) return local;
      const drafts = local.filter((r) => !isComplete(r));
      return [...serverTable.map(withId), ...drafts];
    });
  }, [data.data]);

  if (!data.data) return <WeatherSkeleton />;

  const commitCurrent = (patchCurrent: CurrentPatch = {}) => {
    const next = { ...draftRef.current, ...patchCurrent };
    setCurrentDraft(next);
    draftRef.current = next;
    const server = lastServerRef.current;
    if (server && sameCurrent(next, server.current)) return;
    set.mutate({ current: next });
  };

  /** Save the complete rows; blank/incomplete rows stay local as drafts. */
  const persistTable = (nextRows: EditableRow[]) => {
    const complete = nextRows.filter(isComplete).map(stripId);
    if (sameTable(complete, lastServerRef.current?.table ?? [])) return;
    set.mutate({ table: complete.length ? complete : null });
  };

  const editRow = (rowId: string, rowPatch: Partial<WeatherTableEntry>) =>
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...rowPatch } : r)));
  const commitRowWeight = (rowId: string) => {
    const next = rows.map((r) =>
      r.rowId === rowId ? { ...r, weight: Math.max(1, r.weight || 1) } : r,
    );
    setRows(next);
    persistTable(next);
  };
  const removeRow = (rowId: string) => {
    const next = rows.filter((r) => r.rowId !== rowId);
    setRows(next);
    persistTable(next);
  };
  const appendRows = (entries: WeatherTableEntry[]) => {
    const next = [...rows, ...entries.map(withId)];
    setRows(next);
    persistTable(next);
  };
  const addDraftRow = () =>
    setRows((prev) => [...prev, withId({ weight: 1, condition: "", temperature: "", description: "" })]);
  const resetTable = () => {
    setRows([]);
    set.mutate({ table: null });
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={tab}
        onChange={(t) => patch({ tab: t })}
        options={[
          { value: "current", label: "Current" },
          { value: "table", label: "Roll table" },
        ]}
      />
      <div key={tab} className="min-h-0 flex-1 overflow-y-auto animate-[fadeIn_0.12s_ease-out]">
        {tab === "current" ? (
          <CurrentPanel
            draft={currentDraft}
            saving={set.isPending}
            rollPending={roll.isPending}
            onField={(p) => setCurrentDraft((d) => ({ ...d, ...p }))}
            onCommit={commitCurrent}
            onRoll={() => roll.mutate()}
          />
        ) : (
          <TablePanel
            rows={rows}
            saving={set.isPending}
            onEdit={editRow}
            onRowBlur={() => persistTable(rows)}
            onCommitWeight={commitRowWeight}
            onRemove={removeRow}
            onAppend={appendRows}
            onAddDraft={addDraftRow}
            onReset={resetTable}
            onUseAsCurrent={(entry) =>
              commitCurrent({
                condition: entry.condition,
                temperature: entry.temperature,
                description: entry.description,
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function SavingHint({ saving }: { saving: boolean }) {
  return saving ? <span className="text-xs text-ink-400">Saving…</span> : null;
}

function CurrentPanel({
  draft,
  saving,
  rollPending,
  onField,
  onCommit,
  onRoll,
}: {
  draft: CurrentDraft;
  saving: boolean;
  rollPending: boolean;
  onField: (patch: CurrentPatch) => void;
  onCommit: (patch?: CurrentPatch) => void;
  onRoll: () => void;
}) {
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-ink-400">Currently</span>
        <SavingHint saving={saving} />
      </div>

      <div className="flex items-start gap-2.5">
        <span className="text-4xl leading-none" title={draft.condition || "Unknown"}>
          {weatherIcon(draft.condition)}
        </span>
        <div className="flex-1 space-y-1.5">
          <input
            className="input text-lg font-semibold"
            placeholder="Condition (e.g. Rain)"
            value={draft.condition}
            onChange={(e) => onField({ condition: e.target.value })}
            onBlur={() => onCommit()}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <input
            className="input text-sm"
            placeholder="Temperature"
            value={draft.temperature}
            onChange={(e) => onField({ temperature: e.target.value })}
            onBlur={() => onCommit()}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <div className="flex flex-wrap gap-1">
            {TEMPERATURES.map((t) => (
              <button
                key={t}
                className={clsx(
                  "rounded-full border px-2 py-0.5 text-xs transition-colors",
                  draft.temperature.trim().toLowerCase() === t.toLowerCase()
                    ? "border-accent-500 bg-accent-500/15 text-accent-300"
                    : "border-ink-700 text-ink-400 hover:bg-ink-800",
                )}
                onClick={() => onCommit({ temperature: t })}
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
        value={draft.description}
        onChange={(e) => onField({ description: e.target.value })}
        onBlur={() => onCommit()}
      />

      <PendingButton className="btn-primary w-full" onClick={onRoll} pending={rollPending}>
        🎲 Roll new weather
      </PendingButton>

      <div>
        <div className="mb-1.5 text-xs uppercase tracking-wide text-ink-400">Quick set</div>
        <div className="grid grid-cols-2 gap-1">
          {WEATHER_PRESETS.map((p) => {
            const active = draft.condition.trim().toLowerCase() === p.condition.toLowerCase();
            return (
              <button
                key={p.condition}
                title={`${p.condition} — ${p.temperature}`}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1 text-left text-sm transition-colors",
                  active ? "border-accent-500 bg-accent-500/10" : "border-ink-700 hover:bg-ink-800",
                )}
                onClick={() =>
                  onCommit({
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
    </div>
  );
}

function TablePanel({
  rows,
  saving,
  onEdit,
  onRowBlur,
  onCommitWeight,
  onRemove,
  onAppend,
  onAddDraft,
  onReset,
  onUseAsCurrent,
}: {
  rows: EditableRow[];
  saving: boolean;
  onEdit: (rowId: string, patch: Partial<WeatherTableEntry>) => void;
  onRowBlur: () => void;
  onCommitWeight: (rowId: string) => void;
  onRemove: (rowId: string) => void;
  onAppend: (entries: WeatherTableEntry[]) => void;
  onAddDraft: () => void;
  onReset: () => void;
  onUseAsCurrent: (entry: WeatherTableEntry) => void;
}) {
  const totalWeight = rows.reduce((s, r) => s + (r.weight || 0), 0);
  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-400">
          Weighted options for <span className="text-ink-300">Roll new weather</span>. Higher weight
          = more likely. Changes save automatically; blank rows are ignored.
        </p>
        <SavingHint saving={saving} />
      </div>

      {rows.length === 0 ? (
        <div className="space-y-2 rounded-md border border-dashed border-ink-700 px-3 py-4 text-center text-sm text-ink-400">
          <p>No custom table — rolls use the built-in default.</p>
          <button
            className="btn-ghost h-7 text-xs text-accent-400 hover:text-accent-300"
            onClick={() => onAppend(DEFAULT_WEATHER_TABLE.map((r) => ({ ...r })))}
            title="Copy the built-in table here so you can tweak weights and add conditions"
          >
            ✎ Customize the default table
          </button>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <TableRowItem
              key={row.rowId}
              row={row}
              totalWeight={totalWeight}
              onEdit={onEdit}
              onRowBlur={onRowBlur}
              onCommitWeight={onCommitWeight}
              onRemove={onRemove}
              onUseAsCurrent={onUseAsCurrent}
            />
          ))}
        </ul>
      )}

      {/* Quick-add a preset as a roll-table row (weight 1, then tweak). */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-ink-500">Quick add:</span>
        {WEATHER_PRESETS.map((p: WeatherPreset) => (
          <button
            key={p.condition}
            className="btn-ghost h-7 px-1.5 text-base leading-none"
            onClick={() =>
              onAppend([
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
        <button className="btn-ghost h-7 text-xs" onClick={onAddDraft}>
          + Custom row
        </button>
        {rows.length > 0 && (
          <button
            className="btn-ghost h-7 text-xs text-ink-400 hover:text-red-400"
            onClick={onReset}
            title="Clear the custom table and use the default"
          >
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}

function TableRowItem({
  row,
  totalWeight,
  onEdit,
  onRowBlur,
  onCommitWeight,
  onRemove,
  onUseAsCurrent,
}: {
  row: EditableRow;
  totalWeight: number;
  onEdit: (rowId: string, patch: Partial<WeatherTableEntry>) => void;
  onRowBlur: () => void;
  onCommitWeight: (rowId: string) => void;
  onRemove: (rowId: string) => void;
  onUseAsCurrent: (entry: WeatherTableEntry) => void;
}) {
  const complete = isComplete(row);
  const pct = totalWeight > 0 ? Math.round((row.weight / totalWeight) * 100) : 0;
  return (
    <li
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
          onChange={(e) => onEdit(row.rowId, { condition: e.target.value })}
          onBlur={onRowBlur}
        />
        <input
          type="number"
          className="input w-12 text-center font-mono text-xs"
          min={1}
          value={row.weight}
          onChange={(e) => onEdit(row.rowId, { weight: Number(e.target.value) })}
          onBlur={() => onCommitWeight(row.rowId)}
          title="Relative weight"
        />
        <span className="w-9 shrink-0 text-right text-xs text-ink-400" title="Chance">
          {complete ? `${pct}%` : "—"}
        </span>
        <button
          className="btn-ghost h-7 px-1.5 text-xs text-ink-400 hover:text-accent-400 disabled:opacity-40"
          disabled={!complete}
          onClick={() => onUseAsCurrent(stripId(row))}
          title="Make this the current weather"
          aria-label={`Set ${row.condition || "row"} as current weather`}
        >
          ↑ Now
        </button>
        <button
          className="btn-ghost h-7 px-2 text-ink-400 hover:text-red-400"
          onClick={() => onRemove(row.rowId)}
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
          onChange={(e) => onEdit(row.rowId, { temperature: e.target.value })}
          onBlur={onRowBlur}
        />
        <input
          className="input flex-1 text-xs"
          placeholder="Description"
          value={row.description}
          onChange={(e) => onEdit(row.rowId, { description: e.target.value })}
          onBlur={onRowBlur}
        />
      </div>
    </li>
  );
}

/** Loading placeholder mirroring the tab bar + Current panel so there is no
 *  layout shift when the data arrives. */
function WeatherSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden="true">
      <div className="flex gap-1 border-b border-ink-700 px-2 py-1.5">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="space-y-3 p-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-[52px]" />
        <Skeleton className="h-9" />
        <Skeleton className="h-24" />
      </div>
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
