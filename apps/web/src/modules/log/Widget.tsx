import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { EmptyState } from "../../components/EmptyState.js";
import { useToast } from "../../components/Toast.js";
import { useAddLogNote, useLog } from "./api.js";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isSame = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (isSame(d, today)) return "Today";
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (isSame(d, yest)) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/** Color the kind chip by event family (prefix before the first dot). */
function kindColor(kind: string): string {
  const family = kind.split(".")[0];
  switch (family) {
    case "combat":
      return "border-red-500/40 bg-red-500/10 text-red-300";
    case "session":
      return "border-accent-500/40 bg-accent-500/10 text-accent-300";
    case "npc":
    case "bestiary":
      return "border-violet-500/40 bg-violet-500/10 text-violet-300";
    case "party":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "dice":
    case "rolltable":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "shop":
      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
    case "weather":
    case "calendar":
    case "clock":
      return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    default:
      return "border-ink-600 bg-ink-800 text-ink-300";
  }
}

function SessionLogWidget({ campaignId }: WidgetContext) {
  const log = useLog(campaignId);
  const addNote = useAddLogNote(campaignId);
  const toast = useToast();
  const [note, setNote] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const submitNote = () => {
    const message = note.trim();
    if (!message) return;
    addNote.mutate(
      { kind: "note", message },
      {
        onSuccess: () => setNote(""),
        onError: (err) =>
          toast(err instanceof Error ? err.message : "Failed to add note", "error"),
      },
    );
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  // Per-kind counts for the filter dropdown.
  const kindCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of log.data ?? []) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
    return counts;
  }, [log.data]);
  const kinds = useMemo(() => Array.from(kindCounts.keys()).sort(), [kindCounts]);

  // API returns newest-first; render oldest-first like a transcript.
  const entries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = (log.data ?? []).filter(
      (e) =>
        (!kindFilter || e.kind === kindFilter) &&
        (!q || e.message.toLowerCase().includes(q) || e.kind.toLowerCase().includes(q)),
    );
    return filtered.slice().reverse();
  }, [log.data, kindFilter, search]);

  // Auto-scroll to newest when the user is already near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const exportHref =
    `/api/campaigns/${campaignId}/log/export` +
    (kindFilter ? `?kind=${encodeURIComponent(kindFilter)}` : "");

  let lastDay = "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-700 px-3 py-1.5 text-xs text-ink-400">
        <span className="shrink-0">{entries.length} entries</span>
        {kinds.length > 0 && (
          <select
            className="input h-6 py-0 text-xs"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
          >
            <option value="">All kinds ({log.data?.length ?? 0})</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k} ({kindCounts.get(k)})
              </option>
            ))}
          </select>
        )}
        <input
          className="input h-6 flex-1 py-0 text-xs"
          placeholder="Search log…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <a
          className="shrink-0 text-accent-500 hover:text-accent-400"
          href={exportHref}
          download
          title={kindFilter ? `Export "${kindFilter}" entries` : "Export full log"}
        >
          Export ↓
        </a>
      </div>

      <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-1.5">
        <span className="shrink-0 text-xs text-ink-500" aria-hidden="true">🪶</span>
        <input
          className="input h-6 flex-1 py-0 text-xs"
          placeholder="Add a note to the log…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitNote()}
          autoComplete="off"
        />
        <button
          className="btn-primary h-6 shrink-0 px-2 py-0 text-xs"
          disabled={addNote.isPending || !note.trim()}
          onClick={submitNote}
        >
          Add
        </button>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-auto px-2 py-2 text-sm">
        {entries.map((entry) => {
          const day = dayLabel(entry.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const hasData = entry.data && Object.keys(entry.data).length > 0;
          const isOpen = expanded === entry.id;
          return (
            <div key={entry.id}>
              {showDay && (
                <div className="sticky top-0 z-10 -mx-2 mb-1 mt-2 bg-ink-900/90 px-3 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-400 backdrop-blur first:mt-0">
                  {day}
                </div>
              )}
              <div
                className={clsx(
                  "flex items-start gap-2 rounded px-1 py-0.5",
                  hasData && "cursor-pointer hover:bg-ink-800/60",
                )}
                onClick={hasData ? () => setExpanded(isOpen ? null : entry.id) : undefined}
              >
                <span className="shrink-0 font-mono text-xs text-ink-400">{fmtTime(entry.createdAt)}</span>
                <span className={clsx("chip shrink-0 border", kindColor(entry.kind))}>{entry.kind}</span>
                <span className="text-ink-200">{entry.message}</span>
                {hasData && <span className="ml-auto shrink-0 text-xs text-ink-500">{isOpen ? "▾" : "▸"}</span>}
              </div>
              {hasData && isOpen && (
                <pre className="mb-1 ml-12 overflow-auto rounded-md border border-ink-700 bg-ink-900 p-2 text-[11px] text-ink-400">
                  {JSON.stringify(entry.data, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className="flex h-full items-center justify-center p-4">
            <EmptyState
              icon="🪶"
              title={kindFilter || search ? "No matching entries" : "Empty log"}
              description={
                kindFilter || search
                  ? "Try clearing the filter or search."
                  : "Actions across the campaign will appear here automatically."
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: "log",
  title: "Session Log",
  defaultSize: { w: 460, h: 320 },
  Component: SessionLogWidget,
});

export {};
