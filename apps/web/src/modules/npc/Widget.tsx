import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { sampleNpcs, type CreateNpcInput, type GeneratedNpc, type NPC } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useWidgetState } from "../../canvas/useWidgetState.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Skeleton } from "../../components/Skeleton.js";
import { InlineConfirm, PendingButton, ScopeToggle, SearchInput, Tabs } from "../shared.js";
import { CreatureSheetModal } from "../../components/statblock/CreatureSheetModal.js";
import { useWidgetBroadcast } from "../broadcast/api.js";
import {
  useCreateNpc,
  useDeleteNpc,
  useGenerateNpc,
  useNpcs,
  useUpdateNpc,
} from "./api.js";

const CULTURES = [
  { value: "", label: "Any culture" },
  { value: "generic", label: "Generic" },
  { value: "northern", label: "Northern" },
  { value: "desert", label: "Desert" },
  { value: "imperial", label: "Imperial" },
  { value: "spacer", label: "Spacer / sci-fi" },
] as const;

type Tab = "library" | "generator";

function NpcLibraryWidget({ campaignId, state, setState, broadcastKey }: WidgetContext) {
  const [{ tab }, patch] = useWidgetState({ state, setState }, { tab: "library" as Tab });
  const setTab = (t: Tab) => patch({ tab: t });

  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "library", label: "Library" },
          { value: "generator", label: "Generator" },
        ]}
      />
      {tab === "library" ? (
        <LibraryTab campaignId={campaignId} broadcastKey={broadcastKey} />
      ) : (
        <GeneratorTab campaignId={campaignId} />
      )}
    </div>
  );
}

function LibraryTab({ campaignId, broadcastKey }: { campaignId: string; broadcastKey?: string }) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"campaign" | "all">("campaign");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const filters = useMemo(
    () => ({
      campaignId,
      ...(scope === "all" ? { includeGlobal: true } : {}),
      q: q.trim() || undefined,
      favorite: onlyFavorites || undefined,
    }),
    [campaignId, q, scope, onlyFavorites],
  );
  const list = useNpcs(filters);
  const update = useUpdateNpc();
  const remove = useDeleteNpc();
  const create = useCreateNpc();

  // Spotlight: share a single NPC to players via the widget's broadcast key.
  const { active, payload, share } = useWidgetBroadcast(campaignId, broadcastKey ?? "npc");
  const sharedNpcId =
    active && typeof payload.npcId === "string" ? (payload.npcId as string) : null;
  const shareNpc = (npcId: string) => share({ npcId });

  const count = list.data?.length ?? 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Filter bar */}
      <div className="space-y-2 border-b border-ink-700 p-2">
        <div className="flex items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search name / role / notes…" />
          <ScopeToggle value={scope} onChange={setScope} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label
            className={clsx(
              "flex cursor-pointer select-none items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
              onlyFavorites
                ? "border-amber-600 bg-amber-700/30 text-amber-200"
                : "border-ink-700 text-ink-400 hover:bg-ink-800",
            )}
            title="Show favorites only"
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={onlyFavorites}
              onChange={(e) => setOnlyFavorites(e.target.checked)}
            />
            ★ Faves
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink-400">
              {list.isLoading ? "Loading…" : `${count} ${count === 1 ? "NPC" : "NPCs"}`}
            </span>
            <button
              className="btn-ghost h-7 px-2 text-xs"
              disabled={create.isPending}
              title="Add the SRD sample NPCs to this campaign"
              onClick={() => {
                for (const n of sampleNpcs) create.mutate({ ...n, campaignId });
              }}
            >
              Samples
            </button>
            <button
              className="btn-primary h-7 px-2.5 text-xs"
              onClick={() => create.mutate({ name: "New NPC", campaignId, tags: [] })}
              title="New NPC"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      <ul className="flex-1 space-y-1.5 overflow-auto p-2 text-sm">
        {list.isLoading && (
          <li aria-hidden="true" className="space-y-1.5">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </li>
        )}
        {list.data?.map((n) => (
          <NpcRow
            key={n.id}
            npc={n}
            campaignId={campaignId}
            shared={sharedNpcId === n.id}
            onShare={() => shareNpc(n.id)}
            onChange={(input) => update.mutate({ id: n.id, input })}
            onDelete={() => remove.mutate(n.id)}
            onCopy={(target) => create.mutate({ ...npcToCreateInput(n), campaignId: target })}
          />
        ))}
        {!list.isLoading && count === 0 && (
          <li className="px-2 py-2">
            <EmptyState
              compact
              icon="🧑‍🤝‍🧑"
              title="No NPCs match your filters."
              description="Use + Add, the Generator, or Samples."
            />
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * Build a create payload from an existing NPC, for copying between scopes.
 * `locationId` is intentionally dropped — it is campaign-bound and would dangle.
 */
function npcToCreateInput(n: NPC): Omit<CreateNpcInput, "campaignId"> {
  return {
    name: n.name,
    role: n.role ?? undefined,
    quirk: n.quirk ?? undefined,
    hook: n.hook ?? undefined,
    notes: n.notes ?? undefined,
    tags: n.tags,
    portraitAssetId: n.portraitAssetId ?? undefined,
    favorite: n.favorite,
    stats: n.stats,
  };
}

interface NpcRowProps {
  npc: NPC;
  campaignId: string;
  /** True when this NPC is the one currently spotlighted to players. */
  shared: boolean;
  /** Spotlight this NPC to the player view. */
  onShare: () => void;
  onChange: (input: Parameters<ReturnType<typeof useUpdateNpc>["mutate"]>[0]["input"]) => void;
  onDelete: () => void;
  /** Copy this NPC into the given scope (campaign id, or undefined for the global library). */
  onCopy: (target: string | undefined) => void;
}

function NpcRow({ npc, campaignId, shared, onShare, onChange, onDelete, onCopy }: NpcRowProps) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [localName, setLocalName] = useState(npc.name);
  const [localRole, setLocalRole] = useState(npc.role ?? "");

  useEffect(() => setLocalName(npc.name), [npc.name]);
  useEffect(() => setLocalRole(npc.role ?? ""), [npc.role]);

  const isLibrary = npc.campaignId == null;

  return (
    <li className="overflow-hidden rounded-lg border border-ink-700 bg-ink-900 transition-colors hover:border-ink-600">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          className="shrink-0 text-ink-400 transition-colors hover:text-ink-200"
          onClick={() => setOpen((v) => !v)}
          title={open ? "Collapse" : "Expand"}
          aria-label={open ? "Collapse NPC" : "Expand NPC"}
          aria-expanded={open}
        >
          {open ? "▾" : "▸"}
        </button>
        {isLibrary && (
          <span
            className="chip shrink-0 border-sky-700/60 bg-sky-900/30 text-sky-300"
            title="Shared library NPC"
          >
            Lib
          </span>
        )}
        <input
          className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-ink-50 transition-colors hover:border-ink-700 focus:border-accent-500 focus:bg-ink-950 focus:outline-none focus:ring-1 focus:ring-accent-500"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => localName !== npc.name && onChange({ name: localName })}
          placeholder="Name"
        />
        <input
          className="w-24 shrink-0 truncate rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-ink-300 transition-colors hover:border-ink-700 focus:border-accent-500 focus:bg-ink-950 focus:text-ink-50 focus:outline-none focus:ring-1 focus:ring-accent-500"
          placeholder="Role"
          value={localRole}
          onChange={(e) => setLocalRole(e.target.value)}
          onBlur={() => (localRole || undefined) !== (npc.role ?? undefined) && onChange({ role: localRole || undefined })}
        />
        <button
          className={clsx(
            "btn h-7 w-7 shrink-0 p-0 text-sm transition-colors",
            npc.favorite
              ? "bg-amber-700/60 text-amber-200"
              : "bg-ink-800 text-ink-400 hover:text-amber-300",
          )}
          onClick={() => onChange({ favorite: !npc.favorite })}
          title={npc.favorite ? "Unfavorite" : "Favorite"}
          aria-label={npc.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={npc.favorite}
        >
          ★
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          {isLibrary ? (
            <button
              className="btn-ghost h-7 gap-1 px-2 text-xs text-accent-500 hover:text-accent-400"
              onClick={() => onCopy(campaignId)}
              title="Copy this library NPC into the current campaign"
            >
              ↘ Import
            </button>
          ) : npc.campaignId === campaignId ? (
            <button
              className="btn-ghost h-7 gap-1 px-2 text-xs"
              onClick={() => onCopy(undefined)}
              title="Copy this NPC into the shared library"
            >
              ↗ Library
            </button>
          ) : null}
          <button
            className={clsx(
              "btn h-7 px-2 text-xs transition-colors",
              shared
                ? "bg-accent-600 text-white hover:bg-accent-500"
                : "btn-ghost text-ink-300 hover:text-accent-400",
            )}
            onClick={onShare}
            title={shared ? "Currently shown to players" : "Spotlight this NPC to players"}
          >
            {shared ? "★ Live" : "Share"}
          </button>
          <button className="btn-ghost h-7 px-2 text-xs" onClick={() => setSheet(true)} title="Open stat sheet">
            Sheet
          </button>
          <InlineConfirm onConfirm={onDelete} title="Delete NPC" />
        </div>
      </div>

      {/* Tag chips in collapsed view */}
      {!open && npc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-7 pb-1.5">
          {npc.tags.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="space-y-1.5 border-t border-ink-700 px-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="mb-0.5 block text-ink-400">Quirk</label>
              <input
                className="input"
                placeholder="A distinctive trait…"
                defaultValue={npc.quirk ?? ""}
                onBlur={(e) => onChange({ quirk: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-ink-400">Hook</label>
              <input
                className="input"
                placeholder="A plot hook…"
                defaultValue={npc.hook ?? ""}
                onBlur={(e) => onChange({ hook: e.target.value || undefined })}
              />
            </div>
          </div>
          <div>
            <label className="mb-0.5 block text-ink-400">Notes</label>
            <textarea
              className="input min-h-[70px]"
              placeholder="GM notes…"
              defaultValue={npc.notes ?? ""}
              onBlur={(e) => onChange({ notes: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-ink-400">Tags</label>
            <input
              className="input"
              placeholder="tag1, tag2…"
              defaultValue={npc.tags.join(", ")}
              onBlur={(e) =>
                onChange({
                  tags: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>
      )}

      {sheet && (
        <CreatureSheetModal
          open
          onClose={() => setSheet(false)}
          title={npc.name}
          subtitle={npc.role}
          campaignId={campaignId}
          rollerName={npc.name}
          kind="npc"
          stats={npc.stats}
          onChange={(next) => onChange({ stats: next })}
          flavor={
            npc.quirk || npc.hook ? (
              <div className="space-y-1 text-sm text-ink-300">
                {npc.quirk && <p><span className="font-semibold text-ink-200">Quirk: </span>{npc.quirk}</p>}
                {npc.hook && <p><span className="font-semibold text-ink-200">Hook: </span>{npc.hook}</p>}
              </div>
            ) : undefined
          }
        />
      )}
    </li>
  );
}

const ARCHETYPES = ["brute", "skirmisher", "caster", "leader", "lurker"] as const;

function GeneratorTab({ campaignId }: { campaignId: string }) {
  const generate = useGenerateNpc();
  const create = useCreateNpc();
  const [culture, setCulture] = useState("");
  const [region, setRegion] = useState("");
  const [role, setRole] = useState("");
  const [count, setCount] = useState(3);
  const [withStats, setWithStats] = useState(false);
  const [level, setLevel] = useState(1);
  const [archetype, setArchetype] = useState<(typeof ARCHETYPES)[number]>("leader");
  const [results, setResults] = useState<GeneratedNpc[]>([]);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const roll = () => {
    setSaved(new Set());
    generate.mutate(
      {
        culture: culture || undefined,
        region: region || undefined,
        role: role || undefined,
        count,
        ...(withStats ? { withStats: true, level, archetype } : {}),
      },
      { onSuccess: (r) => setResults(r.npcs) },
    );
  };

  const save = (n: GeneratedNpc, idx: number) => {
    create.mutate(
      { name: n.name, role: n.role, quirk: n.quirk, hook: n.hook, tags: n.tags, stats: n.stats, campaignId },
      { onSuccess: () => setSaved((prev) => new Set(prev).add(idx)) },
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3 text-sm">
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="mb-0.5 block text-xs text-ink-400">Culture</label>
          <select
            className="input"
            value={culture}
            onChange={(e) => setCulture(e.target.value)}
          >
            {CULTURES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-ink-400">Region tag</label>
          <input
            className="input"
            placeholder="e.g. riverside, slums…"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-ink-400">Force role</label>
          <input
            className="input"
            placeholder="e.g. innkeeper…"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-ink-400">Count</label>
          <input
            type="number"
            className="input"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          />
        </div>
      </div>

      <div className="mt-2 rounded-md border border-ink-700 bg-ink-900/50 p-2">
        <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-ink-300">
          <input type="checkbox" checked={withStats} onChange={(e) => setWithStats(e.target.checked)} />
          Also generate a stat block
        </label>
        {withStats && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div>
              <label className="mb-0.5 block text-xs text-ink-400">Level</label>
              <input
                type="number"
                className="input"
                min={1}
                max={20}
                value={level}
                onChange={(e) => setLevel(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-ink-400">Archetype</label>
              <select
                className="input"
                value={archetype}
                onChange={(e) => setArchetype(e.target.value as (typeof ARCHETYPES)[number])}
              >
                {ARCHETYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <PendingButton className="btn-primary mt-2" onClick={roll} pending={generate.isPending}>
        {generate.isPending ? "Rolling…" : "Roll NPCs"}
      </PendingButton>

      <ul className="mt-3 flex-1 space-y-2 overflow-auto">
        {results.map((n, idx) => (
          <li
            key={idx}
            className={clsx(
              "flex flex-col gap-1.5 rounded-md border px-2 py-2",
              saved.has(idx) ? "border-emerald-700/50 bg-emerald-900/10" : "border-ink-700 bg-ink-900",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {n.name}{" "}
                <span className="text-xs font-normal text-ink-400">— {n.role}</span>
              </span>
              <button
                className={clsx(
                  "btn h-6 shrink-0 px-2 text-xs",
                  saved.has(idx) ? "btn-ghost text-emerald-400" : "btn-ghost",
                )}
                onClick={() => save(n, idx)}
                disabled={saved.has(idx)}
              >
                {saved.has(idx) ? "✓ Saved" : "Save"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 text-xs text-ink-300">
              <div>
                <span className="text-ink-400">Quirk: </span>
                {n.quirk}
              </div>
              <div>
                <span className="text-ink-400">Hook: </span>
                {n.hook}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {n.stats && (
                <span className="chip border-accent-700/50 bg-accent-900/20 text-accent-200">
                  ⚄ statblock
                </span>
              )}
              {n.tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          </li>
        ))}
        {results.length === 0 && (
          <li className="py-2">
            <EmptyState compact icon="🎲" title="Nothing rolled yet" description="Choose a culture and roll some NPCs." />
          </li>
        )}
      </ul>
    </div>
  );
}

registerWidget({
  type: "npc",
  title: "NPC Library",
  defaultSize: { w: 480, h: 460 },
  broadcastKey: "npc",
  share: "model",
  Component: NpcLibraryWidget,
});

export {};
