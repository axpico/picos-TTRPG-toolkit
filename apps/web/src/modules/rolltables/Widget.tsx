import { useEffect, useState } from "react";
import clsx from "clsx";
import type { RollTable, RollTableEntry, RollTableResult } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { InlineConfirm } from "../shared.js";
import {
  useCreateTable,
  useDeleteTable,
  useRollOnTable,
  useRollTables,
  useUpdateTable,
} from "./api.js";

function RollTablesWidget({ campaignId }: WidgetContext) {
  const list = useRollTables(campaignId);
  const create = useCreateTable(campaignId);
  const update = useUpdateTable(campaignId);
  const remove = useDeleteTable(campaignId);
  const roll = useRollOnTable(campaignId);
  const [newName, setNewName] = useState("");
  const [latest, setLatest] = useState<RollTableResult | null>(null);

  const doCreate = () => {
    const name = newName.trim();
    if (!name) return;
    create.mutate(
      { name, entries: [{ weight: 1, text: "" }] },
      { onSuccess: () => setNewName("") },
    );
  };

  const doRoll = (tableId: string) => {
    roll.mutate(tableId, { onSuccess: (result) => setLatest(result) });
  };

  return (
    <div className="flex h-full flex-col">
      {/* New table bar */}
      <div className="flex items-center gap-1 border-b border-ink-700 px-2 py-1.5">
        <input
          className="input flex-1"
          placeholder="New table name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doCreate()}
        />
        <button
          className="btn-primary px-2"
          disabled={!newName.trim() || create.isPending}
          onClick={doCreate}
        >
          +
        </button>
      </div>

      {/* Latest result banner */}
      {latest && (
        <div className="flex items-baseline gap-2 border-b border-ink-700 bg-accent-500/10 px-3 py-2">
          <span className="text-xs uppercase tracking-wide text-ink-400">{latest.tableName}</span>
          <span className="text-ink-400">→</span>
          <span className="text-base font-semibold text-accent-500">{latest.text}</span>
        </div>
      )}

      {/* Table list */}
      <div className="flex-1 space-y-2 overflow-auto p-2">
        {list.data && list.data.length > 0 ? (
          list.data.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              rolling={roll.isPending}
              onRoll={() => doRoll(table.id)}
              onChange={(input) => update.mutate({ id: table.id, input })}
              onDelete={() => remove.mutate(table.id)}
            />
          ))
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-ink-500">
            No tables yet.
            <br />
            Create one for loot, names, rumors, or random events.
          </div>
        )}
      </div>
    </div>
  );
}

interface TableCardProps {
  table: RollTable;
  rolling: boolean;
  onRoll: () => void;
  onChange: (input: { name?: string; description?: string | null; entries?: RollTableEntry[] }) => void;
  onDelete: () => void;
}

function TableCard({ table, rolling, onRoll, onChange, onDelete }: TableCardProps) {
  const [editing, setEditing] = useState(false);
  const [localName, setLocalName] = useState(table.name);
  const [entries, setEntries] = useState<RollTableEntry[]>(table.entries);

  useEffect(() => setLocalName(table.name), [table.name]);
  useEffect(() => setEntries(table.entries), [table.entries]);

  const canRoll = table.entries.length > 0 && table.entries.some((e) => e.text.trim());

  return (
    <div className="rounded-md border border-ink-700 bg-ink-900">
      {/* Header row */}
      <div className="flex items-center gap-1 border-b border-ink-800 px-2 py-1.5">
        <input
          className="input flex-1 text-sm font-medium"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => localName.trim() && localName !== table.name && onChange({ name: localName.trim() })}
        />
        <span className="shrink-0 font-mono text-xs text-ink-600">{table.entries.length}</span>
        <button
          className="btn-primary h-7 px-2 text-xs"
          disabled={!canRoll || rolling}
          onClick={onRoll}
          title={canRoll ? "Roll on this table" : "Add an entry first"}
        >
          Roll
        </button>
        <button
          className="btn-ghost h-7 px-2 text-xs text-ink-400"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Done" : "Edit"}
        </button>
        <InlineConfirm onConfirm={onDelete} title="Delete table" />
      </div>

      {/* Entry editor */}
      {editing && (
        <div className="space-y-1 p-2">
          <ul className="space-y-1">
            {entries.map((row, idx) => (
              <li key={idx} className="grid grid-cols-12 items-center gap-1">
                <input
                  type="number"
                  className="input col-span-2 text-right"
                  min={1}
                  value={row.weight}
                  onChange={(e) => {
                    const next = [...entries];
                    next[idx] = { ...row, weight: Math.max(1, Number(e.target.value) || 1) };
                    setEntries(next);
                  }}
                  title="Weight"
                />
                <input
                  className="input col-span-9"
                  placeholder="Result text"
                  value={row.text}
                  onChange={(e) => {
                    const next = [...entries];
                    next[idx] = { ...row, text: e.target.value };
                    setEntries(next);
                  }}
                />
                <button
                  className="btn-ghost col-span-1 px-2 text-ink-500 hover:text-red-400"
                  onClick={() => setEntries(entries.filter((_, i) => i !== idx))}
                  title="Remove row"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-1">
            <button
              className="btn-ghost h-7 text-xs"
              onClick={() => setEntries([...entries, { weight: 1, text: "" }])}
            >
              + row
            </button>
            <button
              className="btn-primary h-7 px-3 text-xs"
              onClick={() =>
                onChange({ entries: entries.filter((e) => e.text.trim()) })
              }
            >
              Save entries
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

registerWidget({
  type: "rolltables",
  title: "Random Tables",
  defaultSize: { w: 420, h: 440 },
  broadcastKey: "rolltable:current",
  Component: RollTablesWidget,
});

export {};
