import { useEffect, useRef, useState, type ChangeEvent } from "react";
import clsx from "clsx";
import type { RollTable, RollTableEntry, RollTableResult } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useToast } from "../../components/Toast.js";
import { InlineConfirm } from "../shared.js";
import { copyText } from "../../lib/clipboard.js";
import { downloadJson, parseTablesImport, serializeTables } from "./io.js";
import {
  useCreateTable,
  useDeleteTable,
  useRollOnTable,
  useRollTables,
  useUpdateTable,
} from "./api.js";

/** A rolled result plus a monotonic id so identical text still re-animates. */
interface RollLogItem extends RollTableResult {
  rollId: number;
}

const MAX_HISTORY = 5;

function RollTablesWidget({ campaignId }: WidgetContext) {
  const toast = useToast();
  const list = useRollTables(campaignId);
  const create = useCreateTable(campaignId);
  const update = useUpdateTable(campaignId);
  const remove = useDeleteTable(campaignId);
  const roll = useRollOnTable(campaignId);
  const [newName, setNewName] = useState("");
  const [history, setHistory] = useState<RollLogItem[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const rollIdRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const tables = list.data ?? [];
  const latest = history[0] ?? null;

  const fail = (e: unknown, fallback: string) =>
    toast(e instanceof Error ? e.message : fallback, "error");

  const doCreate = () => {
    const name = newName.trim();
    if (!name) return;
    // Create empty: the server's schema rejects blank-text entries, so a seed
    // entry would silently 400. New tables open straight into edit mode.
    create.mutate(
      { name },
      {
        onSuccess: () => setNewName(""),
        onError: (e) => fail(e, "Could not create table."),
      },
    );
  };

  const doRoll = (tableId: string) => {
    roll.mutate(tableId, {
      onSuccess: (result) =>
        setHistory((h) => [{ ...result, rollId: ++rollIdRef.current }, ...h].slice(0, MAX_HISTORY)),
      onError: (e) => fail(e, "Roll failed."),
    });
  };

  const copyLatest = async () => {
    if (!latest) return;
    if (await copyText(latest.text)) {
      toast("Copied result.", "success");
    } else {
      toast("Couldn't copy to clipboard.", "error");
    }
  };

  const doExport = () => {
    if (tables.length === 0) {
      toast("No tables to export.", "info");
      return;
    }
    downloadJson("rolltables.json", serializeTables(tables));
  };

  const doCopyExport = async () => {
    if (tables.length === 0) {
      toast("No tables to export.", "info");
      return;
    }
    if (await copyText(serializeTables(tables))) {
      toast("Tables copied as JSON.", "success");
    } else {
      toast("Couldn't copy to clipboard.", "error");
    }
  };

  const runImport = async (text: string) => {
    let inputs;
    try {
      inputs = parseTablesImport(text);
    } catch (e) {
      fail(e, "Could not parse import.");
      return;
    }
    setImporting(true);
    let ok = 0;
    for (const input of inputs) {
      try {
        await create.mutateAsync(input);
        ok++;
      } catch {
        /* counted below */
      }
    }
    setImporting(false);
    const failed = inputs.length - ok;
    if (ok > 0) toast(`Imported ${ok} table${ok === 1 ? "" : "s"}.`, "success");
    if (failed > 0) toast(`${failed} table${failed === 1 ? "" : "s"} failed to import.`, "error");
    if (failed === 0) {
      setImportOpen(false);
      setImportText("");
    }
  };

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    file
      .text()
      .then(runImport)
      .catch(() => toast("Couldn't read file.", "error"));
  };

  return (
    <div className="flex h-full flex-col">
      {/* New table bar + import/export */}
      <div className="flex items-center gap-1 border-b border-ink-700 px-2 py-1.5">
        <input
          className="input flex-1"
          placeholder="New table name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doCreate()}
        />
        <button
          className="btn-primary h-9 px-3"
          disabled={!newName.trim() || create.isPending}
          onClick={doCreate}
          title="Create table"
          aria-label="Create table"
        >
          +
        </button>
        <button
          className="btn-ghost h-9 px-2 text-xs text-ink-400"
          onClick={() => setImportOpen((v) => !v)}
          title="Import / export tables"
          aria-label="Import or export tables"
          aria-expanded={importOpen}
        >
          ⇅
        </button>
      </div>

      {/* Import / export panel */}
      {importOpen && (
        <div className="space-y-2 border-b border-ink-700 bg-ink-900/60 p-2">
          <div className="flex flex-wrap gap-1">
            <button className="btn-ghost h-9 px-3 text-xs" onClick={doExport}>
              ⬇ Export file
            </button>
            <button className="btn-ghost h-9 px-3 text-xs" onClick={doCopyExport}>
              ⧉ Copy JSON
            </button>
            <button
              className="btn-ghost h-9 px-3 text-xs"
              onClick={() => fileRef.current?.click()}
            >
              ⬆ Import file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
          <textarea
            className="input no-pan h-20 w-full resize-none font-mono text-xs"
            placeholder="…or paste exported JSON here"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button
            className="btn-primary h-9 w-full text-xs"
            disabled={!importText.trim() || importing}
            onClick={() => runImport(importText)}
          >
            {importing ? "Importing…" : "Import pasted JSON"}
          </button>
        </div>
      )}

      {/* Latest result banner */}
      {latest && (
        <button
          key={latest.rollId}
          onClick={copyLatest}
          title="Click to copy result"
          className="flex animate-[rollPop_0.25s_ease-out] items-baseline gap-2 border-b border-ink-700 bg-accent-500/10 px-3 py-2 text-left hover:bg-accent-500/20"
        >
          <span aria-hidden>🎲</span>
          <span className="text-xs uppercase tracking-wide text-ink-400">{latest.tableName}</span>
          <span className="text-ink-400">→</span>
          <span className="text-base font-semibold text-accent-500">{latest.text}</span>
        </button>
      )}

      {/* Recent rolls */}
      {history.length > 1 && (
        <ul className="border-b border-ink-800 px-3 py-1 text-xs text-ink-400">
          {history.slice(1).map((h) => (
            <li key={h.rollId} className="truncate">
              <span className="text-ink-500">{h.tableName}:</span> {h.text}
            </li>
          ))}
        </ul>
      )}

      {/* Table list */}
      <div className="no-pan flex-1 space-y-2 overflow-auto p-2">
        {tables.length > 0 ? (
          tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              rolling={roll.isPending}
              onRoll={() => doRoll(table.id)}
              onChange={(input) =>
                update.mutate(
                  { id: table.id, input },
                  { onError: (e) => fail(e, "Could not save table.") },
                )
              }
              onDelete={() =>
                remove.mutate(table.id, { onError: (e) => fail(e, "Could not delete table.") })
              }
            />
          ))
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-ink-400">
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
  // Brand-new (entry-less) tables open in edit mode so they're immediately usable.
  const [editing, setEditing] = useState(table.entries.length === 0);
  const [localName, setLocalName] = useState(table.name);
  const [localDesc, setLocalDesc] = useState(table.description ?? "");
  const [entries, setEntries] = useState<RollTableEntry[]>(table.entries);

  useEffect(() => setLocalName(table.name), [table.name]);
  useEffect(() => setLocalDesc(table.description ?? ""), [table.description]);
  useEffect(() => setEntries(table.entries), [table.entries]);

  const canRoll = table.entries.length > 0 && table.entries.some((e) => e.text.trim());

  const saveEntries = () => {
    const cleaned = entries.filter((e) => e.text.trim());
    const desc = localDesc.trim();
    onChange({
      entries: cleaned,
      description: desc ? desc : null,
    });
  };

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
        <span className="shrink-0 font-mono text-xs text-ink-500">{table.entries.length}</span>
        <button
          className="btn-primary h-9 px-3 text-xs"
          disabled={!canRoll || rolling}
          onClick={onRoll}
          title={canRoll ? "Roll on this table" : "Add an entry first"}
        >
          Roll
        </button>
        <button
          className="btn-ghost h-9 px-2 text-xs text-ink-400"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Done" : "Edit"}
        </button>
        <InlineConfirm onConfirm={onDelete} title="Delete table" />
      </div>

      {/* Entry editor */}
      {editing && (
        <div className="space-y-1 p-2">
          {!canRoll && (
            <p className="px-1 text-xs text-ink-400">Add at least one result, then Save to roll.</p>
          )}
          <input
            className="input w-full text-xs"
            placeholder="Description (optional)"
            value={localDesc}
            onChange={(e) => setLocalDesc(e.target.value)}
          />
          <ul className="space-y-1">
            {entries.map((row, idx) => (
              <li key={idx} className="grid grid-cols-12 items-center gap-1">
                <input
                  type="number"
                  inputMode="numeric"
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && idx === entries.length - 1) {
                      setEntries([...entries, { weight: 1, text: "" }]);
                    }
                  }}
                />
                <button
                  className="btn-ghost col-span-1 px-2 text-ink-400 hover:text-red-400"
                  onClick={() => setEntries(entries.filter((_, i) => i !== idx))}
                  title="Remove row"
                  aria-label="Remove row"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-1">
            <button
              className="btn-ghost h-9 text-xs"
              onClick={() => setEntries([...entries, { weight: 1, text: "" }])}
            >
              + row
            </button>
            <button className="btn-primary h-9 px-3 text-xs" onClick={saveEntries}>
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
