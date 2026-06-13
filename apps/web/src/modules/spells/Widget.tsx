import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { CreateSpellInput, Spell, UpdateSpellInput } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useWidgetState } from "../../canvas/useWidgetState.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Skeleton } from "../../components/Skeleton.js";
import { Modal } from "../../components/Modal.js";
import { Markdown } from "../../components/Markdown.js";
import { InlineConfirm, MetaChip, ScopeToggle, SearchInput, Tabs } from "../shared.js";
import { useWidgetBroadcast } from "../broadcast/api.js";
import { useToast } from "../../components/Toast.js";
import {
  useCreateSpell,
  useDeleteSpell,
  useImportStatus,
  useSpells,
  useStartImport,
  useUpdateSpell,
} from "./api.js";
import { findDuplicate } from "./dedup.js";
import { buildIndex, matchSpellInTranscript } from "./match.js";
import { useSpeechRecognition } from "./useSpeechRecognition.js";

type Tab = "library" | "import";

const LEVEL_LABELS = ["Cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

function levelLabel(level: number): string {
  return LEVEL_LABELS[level] ?? `${level}th`;
}

function SpellsWidget({ campaignId, state, setState, broadcastKey }: WidgetContext) {
  const [{ tab }, patch] = useWidgetState({ state, setState }, { tab: "library" as Tab });
  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={tab}
        onChange={(t: Tab) => patch({ tab: t })}
        options={[
          { value: "library", label: "Library" },
          { value: "import", label: "Import" },
        ]}
      />
      {tab === "library" ? (
        <LibraryTab campaignId={campaignId} broadcastKey={broadcastKey} />
      ) : (
        <ImportTab />
      )}
    </div>
  );
}

function LibraryTab({ campaignId, broadcastKey }: { campaignId: string; broadcastKey?: string }) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"campaign" | "all">("all");
  const [level, setLevel] = useState("");
  const [klass, setKlass] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      campaignId,
      ...(scope === "all" ? { includeGlobal: true } : {}),
      q: q.trim() || undefined,
      level: level === "" ? undefined : Number(level),
      class: klass.trim() || undefined,
    }),
    [campaignId, scope, q, level, klass],
  );

  const list = useSpells(filters);
  const create = useCreateSpell();
  const update = useUpdateSpell();
  const remove = useDeleteSpell();

  const toast = useToast();
  // Multi-pin: reveal one or more spells to players via the widget's broadcast
  // key. Pinned ids live in the broadcast payload; toggling rebuilds the list.
  const { payload, share, stop } = useWidgetBroadcast(campaignId, broadcastKey ?? "spells");
  const pinnedIds = useMemo<string[]>(() => {
    const arr = payload.spellIds;
    if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === "string");
    return typeof payload.spellId === "string" ? [payload.spellId] : [];
  }, [payload]);
  const togglePin = useCallback(
    (id: string) => {
      const next = pinnedIds.includes(id)
        ? pinnedIds.filter((x) => x !== id)
        : [...pinnedIds, id];
      if (next.length === 0) stop();
      else share({ spellIds: next });
    },
    [pinnedIds, share, stop],
  );

  // Voice search: match recent speech against the loaded spell names and pop
  // the detail view for a hit. Matching only ever selects — never broadcasts.
  const speech = useSpeechRecognition();
  const nameIndex = useMemo(() => buildIndex(list.data ?? []), [list.data]);
  const lastMatchRef = useRef<string | null>(null);
  useEffect(() => {
    if (!speech.listening) return;
    const spoken = `${speech.transcript} ${speech.interim}`;
    const match = matchSpellInTranscript(spoken, nameIndex);
    if (match && match.id !== lastMatchRef.current) {
      lastMatchRef.current = match.id;
      setDetailId(match.id);
    }
  }, [speech.listening, speech.transcript, speech.interim, nameIndex]);

  const count = list.data?.length ?? 0;
  const detailSpell = detailId ? list.data?.find((s) => s.id === detailId) ?? null : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Filter bar */}
      <div className="space-y-2 border-b border-ink-700 p-2">
        <div className="flex items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search spells…" />
          <MicButton speech={speech} />
          <ScopeToggle value={scope} onChange={setScope} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <select
            className="input"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Spell level"
          >
            <option value="">Any level</option>
            {LEVEL_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Class (e.g. wizard)"
            value={klass}
            onChange={(e) => setKlass(e.target.value)}
          />
        </div>
        {speech.loading && (
          <div className="truncate text-xs italic text-ink-400" aria-live="polite">
            ⏳ {speech.loadingDetail ?? "Loading offline voice model…"}
          </div>
        )}
        {speech.listening && (
          <div className="truncate text-xs italic text-ink-400" aria-live="polite">
            🎤 {speech.interim || speech.transcript.split(" ").slice(-8).join(" ") || "Listening…"}
          </div>
        )}
        {speech.error && <div className="text-xs text-red-400">{speech.error}</div>}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-2 border-b border-ink-700 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400">
            {list.isLoading ? "Loading…" : `${count} ${count === 1 ? "spell" : "spells"}`}
          </span>
          {pinnedIds.length > 0 && (
            <button
              className="chip border-accent-600/60 bg-accent-900/30 text-accent-300 hover:text-accent-200"
              onClick={() => stop()}
              title="Stop sharing all pinned spells with players"
            >
              ★ {pinnedIds.length} live — clear
            </button>
          )}
        </div>
        <button
          className="btn-primary h-7 px-2.5 text-xs"
          onClick={() => create.mutate({ name: "New spell", campaignId, tags: [] })}
        >
          + Add
        </button>
      </div>

      <ul className="flex-1 space-y-1.5 overflow-auto p-2">
        {list.isLoading && (
          <li aria-hidden="true" className="space-y-1.5">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </li>
        )}
        {list.data?.map((s) => (
          <SpellRow
            key={s.id}
            spell={s}
            campaignId={campaignId}
            shared={pinnedIds.includes(s.id)}
            onShare={() => togglePin(s.id)}
            onOpen={() => setDetailId(s.id)}
            onChange={(input) => update.mutate({ id: s.id, input })}
            onDelete={() => remove.mutate(s.id)}
            onCopy={(target) => {
              const dup = findDuplicate(list.data ?? [], s.name, s.slug, target);
              if (dup) {
                toast(
                  `"${s.name}" is already in ${target ? "this campaign" : "the library"}`,
                  "info",
                );
                return;
              }
              create.mutate({ ...spellToCreateInput(s), campaignId: target });
            }}
          />
        ))}
        {!list.isLoading && count === 0 && (
          <li className="px-2 py-2">
            <EmptyState
              compact
              icon="✨"
              title="No spells match your filters."
              description="Use + Add for a custom spell, or run the wikidot import."
            />
          </li>
        )}
      </ul>

      {detailSpell && (
        <SpellDetailModal spell={detailSpell} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

function MicButton({ speech }: { speech: ReturnType<typeof useSpeechRecognition> }) {
  if (!speech.supported) {
    // `error` carries the specific reason (insecure context, or "configure the
    // offline model" for Firefox); fall back to a neutral hint otherwise.
    const reason = speech.error ?? "Voice search is unavailable in this browser";
    return (
      <button
        className="btn-ghost h-8 shrink-0 px-2 opacity-40"
        disabled
        title={reason}
        aria-label={`Voice search unavailable — ${reason}`}
      >
        🎤
      </button>
    );
  }
  if (speech.loading) {
    // Offline (Vosk) engine downloading / initialising the model.
    return (
      <button
        className="btn-ghost h-8 shrink-0 px-2"
        disabled
        title="Loading offline voice model…"
        aria-label="Loading offline voice model"
      >
        <span className="animate-pulse">⏳</span>
      </button>
    );
  }
  return (
    <button
      className={clsx(
        "btn-ghost h-8 shrink-0 px-2",
        speech.listening && "bg-red-900/40 text-red-300",
      )}
      onClick={() => (speech.listening ? speech.stop() : speech.start())}
      title={
        speech.listening
          ? "Stop voice search"
          : "Start voice search — say a spell name to open it (speech may be processed by your browser vendor)"
      }
      aria-pressed={speech.listening}
      aria-label={speech.listening ? "Stop voice search" : "Start voice search"}
    >
      {speech.listening ? <span className="animate-pulse">●</span> : "🎤"}
    </button>
  );
}

/** Build a create payload from an existing spell, for copying between scopes. */
function spellToCreateInput(s: Spell): Omit<CreateSpellInput, "campaignId"> {
  return {
    name: s.name,
    level: s.level,
    school: s.school ?? undefined,
    castingTime: s.castingTime ?? undefined,
    range: s.range ?? undefined,
    components: s.components ?? undefined,
    duration: s.duration ?? undefined,
    description: s.description || undefined,
    higherLevels: s.higherLevels ?? undefined,
    classes: s.classes,
    ritual: s.ritual,
    concentration: s.concentration,
    source: s.source ?? undefined,
    tags: s.tags,
  };
}

interface RowProps {
  spell: Spell;
  campaignId: string;
  /** True when this spell is the one currently revealed to players. */
  shared: boolean;
  onShare: () => void;
  onOpen: () => void;
  onChange: (input: UpdateSpellInput) => void;
  onDelete: () => void;
  /** Copy into the given scope (campaign id, or undefined for the global library). */
  onCopy: (target: string | undefined) => void;
}

function SpellRow({ spell, campaignId, shared, onShare, onOpen, onChange, onDelete, onCopy }: RowProps) {
  const [open, setOpen] = useState(false);
  const [localName, setLocalName] = useState(spell.name);
  const isLibrary = spell.campaignId == null;

  return (
    <li className="overflow-hidden rounded-lg border border-ink-700 bg-ink-900 transition-colors hover:border-ink-600">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          className="shrink-0 text-ink-400 transition-colors hover:text-ink-200"
          onClick={() => setOpen((v) => !v)}
          title={open ? "Collapse" : "Expand"}
          aria-label={open ? "Collapse spell" : "Expand spell"}
          aria-expanded={open}
        >
          {open ? "▾" : "▸"}
        </button>
        {isLibrary && (
          <span
            className="chip shrink-0 border-sky-700/60 bg-sky-900/30 text-sky-300"
            title="Shared library spell"
          >
            Lib
          </span>
        )}
        <input
          className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-ink-50 transition-colors hover:border-ink-700 focus:border-accent-500 focus:bg-ink-950 focus:outline-none focus:ring-1 focus:ring-accent-500"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => localName !== spell.name && onChange({ name: localName })}
          placeholder="Name"
        />
        <MetaChip title="Level">{levelLabel(spell.level)}</MetaChip>
        {spell.school && <MetaChip title="School">{spell.school}</MetaChip>}
        {spell.ritual && (
          <MetaChip title="Ritual" className="bg-violet-900/30 text-violet-300">
            R
          </MetaChip>
        )}
        {spell.concentration && (
          <MetaChip title="Concentration" className="bg-amber-900/30 text-amber-300">
            C
          </MetaChip>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <CopyButton
            isLibrary={isLibrary}
            sameCampaign={spell.campaignId === campaignId}
            campaignId={campaignId}
            onCopy={onCopy}
          />
          <button
            className={clsx(
              "btn h-7 px-2 text-xs transition-colors",
              shared
                ? "bg-accent-600 text-white hover:bg-accent-500"
                : "btn-ghost text-ink-300 hover:text-accent-400",
            )}
            onClick={onShare}
            title={shared ? "Currently shown to players" : "Reveal this spell to players"}
          >
            {shared ? "★ Live" : "Share"}
          </button>
          <button className="btn-ghost h-7 px-2 text-xs" onClick={onOpen} title="Open spell details">
            Details
          </button>
          <InlineConfirm onConfirm={onDelete} title="Delete spell" />
        </div>
      </div>

      {open && (
        <div className="space-y-2 border-t border-ink-700 bg-ink-950/40 px-2.5 py-2.5 text-xs">
          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex flex-col gap-0.5">
              <span className="text-ink-400">Level</span>
              <select
                className="input"
                value={spell.level}
                onChange={(e) => onChange({ level: Number(e.target.value) })}
              >
                {LEVEL_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Field label="School" value={spell.school} onCommit={(v) => onChange({ school: v })} />
            <Field
              label="Casting time"
              value={spell.castingTime}
              onCommit={(v) => onChange({ castingTime: v })}
            />
            <Field label="Range" value={spell.range} onCommit={(v) => onChange({ range: v })} />
            <Field
              label="Components"
              value={spell.components}
              onCommit={(v) => onChange({ components: v })}
            />
            <Field
              label="Duration"
              value={spell.duration}
              onCommit={(v) => onChange({ duration: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={spell.ritual}
                onChange={(e) => onChange({ ritual: e.target.checked })}
              />
              <span className="text-ink-400">Ritual</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={spell.concentration}
                onChange={(e) => onChange({ concentration: e.target.checked })}
              />
              <span className="text-ink-400">Concentration</span>
            </label>
          </div>
          <label className="flex flex-col gap-0.5">
            <span className="text-ink-400">Classes</span>
            <input
              className="input"
              placeholder="comma, separated"
              defaultValue={spell.classes.join(", ")}
              onBlur={(e) =>
                onChange({
                  classes: e.target.value
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-ink-400">Description</span>
            <textarea
              className="input min-h-[80px]"
              placeholder="What the spell does (markdown)…"
              defaultValue={spell.description}
              onBlur={(e) => onChange({ description: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-ink-400">At higher levels</span>
            <textarea
              className="input min-h-[40px]"
              placeholder="Optional scaling text…"
              defaultValue={spell.higherLevels ?? ""}
              onBlur={(e) => onChange({ higherLevels: e.target.value || undefined })}
            />
          </label>
          <button className="btn-primary w-full py-1.5" onClick={onOpen}>
            Open spell details
          </button>
        </div>
      )}
    </li>
  );
}

function Field({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string | null;
  onCommit: (v: string | undefined) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-ink-400">{label}</span>
      <input
        className="input"
        defaultValue={value ?? ""}
        onBlur={(e) =>
          (e.target.value || undefined) !== (value ?? undefined) &&
          onCommit(e.target.value || undefined)
        }
      />
    </label>
  );
}

/** Copy-between-scopes action; same pattern as the bestiary. */
function CopyButton({
  isLibrary,
  sameCampaign,
  campaignId,
  onCopy,
}: {
  isLibrary: boolean;
  sameCampaign: boolean;
  campaignId: string;
  onCopy: (target: string | undefined) => void;
}) {
  if (isLibrary)
    return (
      <button
        className="btn-ghost h-7 gap-1 px-2 text-xs text-accent-500 hover:text-accent-400"
        onClick={() => onCopy(campaignId)}
        title="Copy this library spell into the current campaign"
      >
        ↘ Import
      </button>
    );
  if (sameCampaign)
    return (
      <button
        className="btn-ghost h-7 gap-1 px-2 text-xs"
        onClick={() => onCopy(undefined)}
        title="Copy this spell into the shared library"
      >
        ↗ Library
      </button>
    );
  return null;
}

function SpellDetailModal({ spell, onClose }: { spell: Spell; onClose: () => void }) {
  const subtitle =
    spell.level === 0
      ? `${spell.school ?? "magic"} cantrip`
      : `${levelLabel(spell.level)} level${spell.school ? ` ${spell.school}` : ""}`;
  const props: [string, string | null][] = [
    ["Casting time", spell.castingTime],
    ["Range", spell.range],
    ["Components", spell.components],
    ["Duration", spell.duration],
  ];
  return (
    <Modal open onClose={onClose} className="w-[min(560px,92vw)]" labelledBy="spell-detail-title">
      <div className="max-h-[80vh] overflow-auto p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="spell-detail-title" className="display text-lg font-semibold text-ink-50">
              {spell.name}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 text-sm capitalize text-ink-400">
              <span>{subtitle}</span>
              {spell.ritual && <span className="chip">Ritual</span>}
              {spell.concentration && <span className="chip">Concentration</span>}
            </div>
          </div>
          <button className="btn-ghost h-7 px-2 text-xs" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {props
            .filter(([, v]) => v)
            .map(([label, v]) => (
              <div key={label}>
                <span className="text-ink-500">{label}: </span>
                <span className="text-ink-200">{v}</span>
              </div>
            ))}
        </div>
        {spell.description && (
          <Markdown className="mt-3 text-sm text-ink-300">{spell.description}</Markdown>
        )}
        {spell.higherLevels && (
          <p className="mt-2 text-sm text-ink-300">
            <span className="font-semibold text-ink-100">At higher levels.</span>{" "}
            {spell.higherLevels}
          </p>
        )}
        {spell.classes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {spell.classes.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>
        )}
        {spell.source && <div className="mt-3 text-xs text-ink-500">Source: {spell.source}</div>}
      </div>
    </Modal>
  );
}

function ImportTab() {
  const [includeUnofficial, setIncludeUnofficial] = useState(false);
  const status = useImportStatus(true);
  const start = useStartImport();
  const s = status.data;
  const running = s?.status === "running";
  const pct = s && s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-auto p-3 text-sm">
      <p className="text-ink-300">
        Import every spell (cantrips through 9th level) from{" "}
        <span className="font-mono text-ink-200">dnd5e.wikidot.com</span> into the shared library.
        Roughly 500 pages are fetched politely, so a full run takes a few minutes. Re-running
        refreshes imported spells and never touches custom ones.
      </p>
      <label className="flex items-center gap-2 text-ink-300">
        <input
          type="checkbox"
          checked={includeUnofficial}
          onChange={(e) => setIncludeUnofficial(e.target.checked)}
          disabled={running}
        />
        Include Unearthed Arcana / homebrew-marked spells
      </label>
      <button
        className="btn-primary py-1.5"
        disabled={running || start.isPending}
        onClick={() => start.mutate({ includeUnofficial })}
      >
        {running ? "Import running…" : "Import all spells"}
      </button>

      {s && s.status !== "idle" && (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded bg-ink-800" role="progressbar" aria-valuenow={pct}>
            <div
              className={clsx("h-full transition-all", s.status === "error" ? "bg-red-600" : "bg-accent-500")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-xs text-ink-400">
            {s.status === "running" && `Importing… ${s.done}/${s.total}`}
            {s.status === "done" && `Done: ${s.done}/${s.total} processed, ${s.failed.length} failed.`}
            {s.status === "error" && `Import failed: ${s.error ?? "unknown error"}`}
          </div>
          {s.failed.length > 0 && (
            <details className="text-xs text-ink-500">
              <summary>{s.failed.length} pages failed</summary>
              <div className="mt-1 break-words font-mono">{s.failed.join(", ")}</div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

registerWidget({
  type: "spells",
  title: "Grimoire",
  defaultSize: { w: 500, h: 480 },
  broadcastKey: "spells",
  share: "model",
  icon: "✨",
  Component: SpellsWidget,
});

export {};
