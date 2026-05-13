import { useEffect, useState } from "react";
import clsx from "clsx";
import type { ExternalLink, SessionEntry } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import {
  useCreateSession,
  useDeleteSession,
  useSession,
  useSessions,
  useUpdateSession,
} from "./api.js";

function SessionsWidget({ campaignId, state, setState }: WidgetContext) {
  const [q, setQ] = useState("");
  const list = useSessions(campaignId, q.trim() || undefined);
  const create = useCreateSession(campaignId);
  const selectedId = (state?.selectedSessionId as string | undefined) ?? null;
  const detail = useSession(campaignId, selectedId);
  const update = useUpdateSession(campaignId);
  const remove = useDeleteSession(campaignId);

  const selectSession = (id: string | null) => setState({ selectedSessionId: id });

  // Auto-select first session if none yet selected.
  useEffect(() => {
    if (!selectedId && list.data && list.data.length > 0) {
      selectSession(list.data[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data, selectedId]);

  return (
    <div className="flex h-full">
      <aside className="flex w-56 flex-col border-r border-ink-700">
        <div className="flex items-center gap-1 border-b border-ink-700 p-2">
          <input
            className="input flex-1 text-xs"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="btn-primary px-2"
            onClick={() => {
              create.mutate(
                { title: "Untitled session", date: new Date().toISOString() },
                { onSuccess: (s) => selectSession(s.id) },
              );
            }}
            title="New session"
          >
            +
          </button>
        </div>
        <ul className="flex-1 overflow-auto">
          {list.data?.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => selectSession(s.id)}
                className={clsx(
                  "block w-full border-b border-ink-800 px-3 py-2 text-left text-sm hover:bg-ink-800",
                  selectedId === s.id && "bg-ink-800 text-ink-50",
                )}
              >
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-ink-400">
                  {s.date ? new Date(s.date).toLocaleDateString() : "no date"}
                </div>
              </button>
            </li>
          ))}
          {list.data?.length === 0 && (
            <li className="px-3 py-2 text-xs text-ink-400">No sessions yet.</li>
          )}
        </ul>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {detail.data ? (
          <SessionEditor
            key={detail.data.id}
            session={detail.data}
            onChange={(input) => update.mutate({ id: detail.data!.id, input })}
            onDelete={() => {
              if (confirm(`Delete session "${detail.data!.title}"?`)) {
                remove.mutate(detail.data!.id, {
                  onSuccess: () => selectSession(null),
                });
              }
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-400">
            Select or create a session.
          </div>
        )}
      </div>
    </div>
  );
}

interface EditorProps {
  session: SessionEntry;
  onChange: (input: Parameters<ReturnType<typeof useUpdateSession>["mutate"]>[0]["input"]) => void;
  onDelete: () => void;
}

function SessionEditor({ session, onChange, onDelete }: EditorProps) {
  // Local-controlled fields with commit on blur to avoid hammering the API.
  const [title, setTitle] = useState(session.title);
  const [summary, setSummary] = useState(session.summary ?? "");
  const [notes, setNotes] = useState(session.notes ?? "");
  const [date, setDate] = useState(session.date ? session.date.slice(0, 10) : "");
  const [links, setLinks] = useState<ExternalLink[]>(session.externalLinks);

  useEffect(() => {
    setTitle(session.title);
    setSummary(session.summary ?? "");
    setNotes(session.notes ?? "");
    setDate(session.date ? session.date.slice(0, 10) : "");
    setLinks(session.externalLinks);
  }, [session.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <header className="flex items-center gap-2 border-b border-ink-700 p-2">
        <input
          className="input flex-1 text-base font-medium"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== session.title && onChange({ title })}
        />
        <input
          type="date"
          className="input w-40"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onBlur={() => {
            const iso = date ? new Date(`${date}T00:00:00Z`).toISOString() : undefined;
            onChange({ date: iso });
          }}
        />
        <button className="btn-danger px-2" onClick={onDelete}>
          Delete
        </button>
      </header>

      <div className="grid grid-cols-1 gap-2 overflow-auto p-3">
        <label className="text-xs uppercase tracking-wide text-ink-400">Summary</label>
        <textarea
          className="input min-h-[60px]"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() =>
            (summary || null) !== (session.summary || null) &&
            onChange({ summary: summary || undefined })
          }
        />

        <label className="mt-2 text-xs uppercase tracking-wide text-ink-400">
          Notes (markdown)
        </label>
        <textarea
          className="input min-h-[200px] font-mono text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() =>
            (notes || null) !== (session.notes || null) &&
            onChange({ notes: notes || undefined })
          }
        />

        <label className="mt-2 text-xs uppercase tracking-wide text-ink-400">
          External links
        </label>
        <ul className="space-y-1">
          {links.map((l, idx) => (
            <li key={idx} className="flex items-center gap-1">
              <input
                className="input w-40"
                placeholder="Label"
                value={l.label}
                onChange={(e) => {
                  const next = [...links];
                  next[idx] = { ...l, label: e.target.value };
                  setLinks(next);
                }}
                onBlur={() => onChange({ externalLinks: links })}
              />
              <input
                className="input flex-1"
                placeholder="https://… or obsidian://…"
                value={l.href}
                onChange={(e) => {
                  const next = [...links];
                  next[idx] = { ...l, href: e.target.value };
                  setLinks(next);
                }}
                onBlur={() => onChange({ externalLinks: links })}
              />
              <a
                className="btn-ghost px-2"
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                title="Open"
              >
                ↗
              </a>
              <button
                className="btn-ghost px-2"
                onClick={() => {
                  const next = links.filter((_, i) => i !== idx);
                  setLinks(next);
                  onChange({ externalLinks: next });
                }}
              >
                ×
              </button>
            </li>
          ))}
          <li>
            <button
              className="btn-ghost h-7 text-xs"
              onClick={() => {
                const next = [...links, { label: "Notes", href: "" }];
                setLinks(next);
              }}
            >
              + add link
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}

registerWidget({
  type: "sessions",
  title: "Sessions / Notes",
  defaultSize: { w: 640, h: 480 },
  Component: SessionsWidget,
});

export {};
