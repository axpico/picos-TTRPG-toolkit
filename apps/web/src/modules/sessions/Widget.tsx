import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { ExternalLink, SessionEntry } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useWidgetState } from "../../canvas/useWidgetState.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Markdown } from "../../components/Markdown.js";
import { useConfirm } from "../../components/ConfirmDialog.js";
import { useToast } from "../../components/Toast.js";
import { copyText } from "../../lib/clipboard.js";
import { useWidgetBroadcast } from "../broadcast/api.js";
import {
  useCreateSession,
  useDeleteSession,
  useSession,
  useSessions,
  useUpdateSession,
} from "./api.js";

type SortMode = "date" | "title";

function relativeDate(iso: string | null): string {
  if (!iso) return "no date";
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days > 1 && days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function snippet(s: SessionEntry): string {
  const src = (s.summary || s.notes || "").replace(/[#*_`>\-\[\]]/g, "").trim();
  return src.length > 80 ? `${src.slice(0, 80)}…` : src;
}

/** Accepts http(s), obsidian://, onenote:, mailto:, and other schemed URIs. */
function isValidHref(href: string): boolean {
  const v = href.trim();
  if (!v) return false;
  return /^[a-z][a-z0-9+.-]*:/i.test(v);
}

function SessionsWidget({ campaignId, state, setState, broadcastKey }: WidgetContext) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortMode>("date");
  const list = useSessions(campaignId, q.trim() || undefined);
  const create = useCreateSession(campaignId);
  const [{ selectedSessionId: selectedId }, patch] = useWidgetState(
    { state, setState },
    { selectedSessionId: null as string | null },
  );
  const detail = useSession(campaignId, selectedId);
  const update = useUpdateSession(campaignId);
  const remove = useDeleteSession(campaignId);
  const confirm = useConfirm();

  // Spotlight: share one session/handout to players via the widget's broadcast key.
  const { active, payload, share } = useWidgetBroadcast(campaignId, broadcastKey ?? "sessions");
  const sharedNoteId =
    active && typeof payload.noteId === "string" ? (payload.noteId as string) : null;
  const shareSession = (noteId: string) => share({ noteId });

  const selectSession = (id: string | null) => patch({ selectedSessionId: id });

  const sessions = useMemo(() => {
    const items = [...(list.data ?? [])];
    if (sort === "title") {
      items.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      items.sort((a, b) => {
        const ad = a.date ? Date.parse(a.date) : 0;
        const bd = b.date ? Date.parse(b.date) : 0;
        return bd - ad;
      });
    }
    return items;
  }, [list.data, sort]);

  // Auto-select first session if none yet selected.
  useEffect(() => {
    if (!selectedId && sessions.length > 0) {
      selectSession(sessions[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, selectedId]);

  const handleDelete = async () => {
    if (!detail.data) return;
    const ok = await confirm({
      title: "Delete session",
      message: `Delete "${detail.data.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) remove.mutate(detail.data.id, { onSuccess: () => selectSession(null) });
  };

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
            aria-label="New session"
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-2 border-b border-ink-800 px-2 py-1 text-[10px] uppercase tracking-wide text-ink-400">
          <span>{sessions.length} sessions</span>
          <button
            className="ml-auto hover:text-ink-200"
            onClick={() => setSort((s) => (s === "date" ? "title" : "date"))}
            title="Toggle sort"
          >
            sort: {sort}
          </button>
        </div>
        <ul className="flex-1 overflow-auto">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => selectSession(s.id)}
                className={clsx(
                  "block w-full border-b border-ink-800 px-3 py-2 text-left hover:bg-ink-800",
                  selectedId === s.id && "bg-ink-800 text-ink-50",
                )}
              >
                <div className="flex items-center gap-1">
                  <span className="flex-1 truncate text-sm font-medium">{s.title}</span>
                  {s.externalLinks.length > 0 && (
                    <span className="chip shrink-0 text-[10px]" title="External links">
                      🔗 {s.externalLinks.length}
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-400">{relativeDate(s.date)}</div>
                {snippet(s) && (
                  <div className="mt-0.5 truncate text-xs text-ink-400">{snippet(s)}</div>
                )}
              </button>
            </li>
          ))}
          {sessions.length === 0 && (
            <li className="px-3 py-2 text-xs text-ink-400">
              {q ? "No matches." : "No sessions yet."}
            </li>
          )}
        </ul>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {detail.data ? (
          <SessionEditor
            key={detail.data.id}
            session={detail.data}
            saving={update.isPending}
            shared={sharedNoteId === detail.data.id}
            onShare={() => shareSession(detail.data!.id)}
            onChange={(input) => update.mutate({ id: detail.data!.id, input })}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              icon="📖"
              title="No session selected"
              description="Pick a session from the list, or create one to start logging your campaign."
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface EditorProps {
  session: SessionEntry;
  saving: boolean;
  /** True when this session is the one currently shared to players. */
  shared: boolean;
  /** Share this session/handout to the player view. */
  onShare: () => void;
  onChange: (input: Parameters<ReturnType<typeof useUpdateSession>["mutate"]>[0]["input"]) => void;
  onDelete: () => void;
}

function SessionEditor({ session, saving, shared, onShare, onChange, onDelete }: EditorProps) {
  // Local-controlled fields with commit on blur to avoid hammering the API.
  const [title, setTitle] = useState(session.title);
  const [summary, setSummary] = useState(session.summary ?? "");
  const [notes, setNotes] = useState(session.notes ?? "");
  const [date, setDate] = useState(session.date ? session.date.slice(0, 10) : "");
  const [links, setLinks] = useState<ExternalLink[]>(session.externalLinks);
  const [preview, setPreview] = useState(Boolean(session.notes));
  const toast = useToast();

  useEffect(() => {
    setTitle(session.title);
    setSummary(session.summary ?? "");
    setNotes(session.notes ?? "");
    setDate(session.date ? session.date.slice(0, 10) : "");
    setLinks(session.externalLinks);
    setPreview(Boolean(session.notes));
  }, [session.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyLink = async (href: string) => {
    if (await copyText(href)) {
      toast("Link copied", "success");
    } else {
      toast("Copy failed", "error");
    }
  };

  return (
    <>
      <header className="flex items-center gap-2 border-b border-ink-700 p-2">
        <input
          className="input flex-1 text-base font-medium"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== session.title && onChange({ title })}
        />
        <span className="w-14 shrink-0 text-right text-[10px] uppercase tracking-wide text-ink-400">
          {saving ? "saving…" : "saved"}
        </span>
        <button
          className={clsx(
            "btn h-7 shrink-0 px-2 text-xs transition-colors",
            shared
              ? "bg-accent-600 text-white hover:bg-accent-500"
              : "btn-ghost text-ink-300 hover:text-accent-400",
          )}
          onClick={onShare}
          title={shared ? "Currently shown to players" : "Share this handout to players"}
        >
          {shared ? "★ Live" : "Share"}
        </button>
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
        <button className="btn-ghost px-2 text-ink-400 hover:text-red-400" title="Delete session" aria-label="Delete session" onClick={onDelete}>
          ×
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

        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs uppercase tracking-wide text-ink-400">Notes (markdown)</label>
          <div className="ml-auto flex overflow-hidden rounded-md border border-ink-700 text-xs">
            <button
              className={clsx("px-2 py-0.5", !preview ? "bg-ink-700 text-ink-50" : "text-ink-400 hover:text-ink-200")}
              onClick={() => setPreview(false)}
            >
              Edit
            </button>
            <button
              className={clsx("px-2 py-0.5", preview ? "bg-ink-700 text-ink-50" : "text-ink-400 hover:text-ink-200")}
              onClick={() => setPreview(true)}
            >
              Preview
            </button>
          </div>
        </div>
        {preview ? (
          <div
            className="min-h-[200px] cursor-text rounded-md border border-ink-700 bg-ink-900/40 p-3"
            onDoubleClick={() => setPreview(false)}
          >
            {notes.trim() ? (
              <Markdown>{notes}</Markdown>
            ) : (
              <span className="text-sm text-ink-400">No notes yet — click Edit to write. Markdown supported.</span>
            )}
          </div>
        ) : (
          <textarea
            className="input min-h-[200px] font-mono text-sm"
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() =>
              (notes || null) !== (session.notes || null) &&
              onChange({ notes: notes || undefined })
            }
          />
        )}

        <label className="mt-2 text-xs uppercase tracking-wide text-ink-400">External links</label>
        <ul className="space-y-1">
          {links.map((l, idx) => {
            const valid = isValidHref(l.href);
            return (
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
                  className={clsx("input flex-1", l.href && !valid && "border-red-500/60")}
                  placeholder="https://… or obsidian://…"
                  value={l.href}
                  onChange={(e) => {
                    const next = [...links];
                    next[idx] = { ...l, href: e.target.value };
                    setLinks(next);
                  }}
                  onBlur={() => onChange({ externalLinks: links })}
                />
                <button
                  className="btn-ghost px-2 disabled:opacity-30"
                  disabled={!valid}
                  onClick={() => copyLink(l.href)}
                  title="Copy link"
                >
                  ⧉
                </button>
                {valid ? (
                  <a className="btn-ghost px-2" href={l.href} target="_blank" rel="noopener noreferrer" title="Open">
                    ↗
                  </a>
                ) : (
                  <span className="btn-ghost px-2 opacity-30" title="Enter a valid URL">
                    ↗
                  </span>
                )}
                <button
                  className="btn-ghost px-2"
                  aria-label="Remove link"
                  title="Remove link"
                  onClick={() => {
                    const next = links.filter((_, i) => i !== idx);
                    setLinks(next);
                    onChange({ externalLinks: next });
                  }}
                >
                  ×
                </button>
              </li>
            );
          })}
          <li>
            <button
              className="btn-ghost h-7 text-xs"
              onClick={() => setLinks([...links, { label: "Notes", href: "" }])}
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
  broadcastKey: "sessions",
  share: "model",
  Component: SessionsWidget,
});

export {};
