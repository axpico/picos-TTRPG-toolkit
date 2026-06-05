import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { sampleNpcs, type CreateNpcInput, type GeneratedNpc, type NPC } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { InlineConfirm } from "../shared.js";
import { CreatureSheetModal } from "../../components/statblock/CreatureSheetModal.js";
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

function NpcLibraryWidget({ campaignId, state, setState }: WidgetContext) {
  const tab = (state?.tab as Tab | undefined) ?? "library";
  const setTab = (t: Tab) => setState({ tab: t });

  return (
    <div className="flex h-full flex-col">
      <nav className="flex gap-1 border-b border-ink-700 px-2 py-1.5 text-sm">
        <button
          className={clsx("btn px-3", tab === "library" ? "btn-primary" : "btn-ghost")}
          onClick={() => setTab("library")}
        >
          Library
        </button>
        <button
          className={clsx("btn px-3", tab === "generator" ? "btn-primary" : "btn-ghost")}
          onClick={() => setTab("generator")}
        >
          Generator
        </button>
      </nav>
      {tab === "library" ? (
        <LibraryTab campaignId={campaignId} />
      ) : (
        <GeneratorTab campaignId={campaignId} />
      )}
    </div>
  );
}

function LibraryTab({ campaignId }: { campaignId: string }) {
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-ink-700 px-2 py-1.5">
        <input
          className="input flex-1"
          placeholder="Search name / role / notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input w-28"
          value={scope}
          onChange={(e) => setScope(e.target.value as "campaign" | "all")}
        >
          <option value="campaign">This campaign</option>
          <option value="all">All</option>
        </select>
        <label
          className={clsx(
            "flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs select-none transition-colors",
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
        <button
          className="btn-ghost px-2 text-xs"
          disabled={create.isPending}
          title="Add the SRD sample NPCs to this campaign"
          onClick={() => {
            for (const n of sampleNpcs) create.mutate({ ...n, campaignId });
          }}
        >
          Samples
        </button>
        <button
          className="btn-primary px-2"
          onClick={() => create.mutate({ name: "New NPC", campaignId, tags: [] })}
          title="New NPC"
        >
          +
        </button>
      </div>

      <ul className="flex-1 space-y-1 overflow-auto p-2 text-sm">
        {list.data?.map((n) => (
          <NpcRow
            key={n.id}
            npc={n}
            campaignId={campaignId}
            onChange={(input) => update.mutate({ id: n.id, input })}
            onDelete={() => remove.mutate(n.id)}
            onCopy={(target) => create.mutate({ ...npcToCreateInput(n), campaignId: target })}
          />
        ))}
        {list.data?.length === 0 && (
          <li className="py-6 text-center text-ink-500">No NPCs match your filters.</li>
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
  onChange: (input: Parameters<ReturnType<typeof useUpdateNpc>["mutate"]>[0]["input"]) => void;
  onDelete: () => void;
  /** Copy this NPC into the given scope (campaign id, or undefined for the global library). */
  onCopy: (target: string | undefined) => void;
}

function NpcRow({ npc, campaignId, onChange, onDelete, onCopy }: NpcRowProps) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [localName, setLocalName] = useState(npc.name);
  const [localRole, setLocalRole] = useState(npc.role ?? "");

  useEffect(() => setLocalName(npc.name), [npc.name]);
  useEffect(() => setLocalRole(npc.role ?? ""), [npc.role]);

  return (
    <li className="rounded-md border border-ink-700 bg-ink-900">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          className="text-ink-500 hover:text-ink-200 shrink-0"
          onClick={() => setOpen((v) => !v)}
          title={open ? "Collapse" : "Expand"}
        >
          {open ? "▾" : "▸"}
        </button>
        {npc.campaignId == null && (
          <span className="chip shrink-0 border-sky-700/60 text-sky-300" title="Shared library NPC">
            Lib
          </span>
        )}
        <input
          className="input flex-1 font-medium"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => localName !== npc.name && onChange({ name: localName })}
          placeholder="Name"
        />
        <input
          className="input w-28 text-xs text-ink-300"
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
              : "bg-ink-800 text-ink-500 hover:text-amber-300",
          )}
          onClick={() => onChange({ favorite: !npc.favorite })}
          title={npc.favorite ? "Unfavorite" : "Favorite"}
        >
          ★
        </button>
        {npc.campaignId == null ? (
          <button
            className="btn-ghost px-2 text-xs"
            onClick={() => onCopy(campaignId)}
            title="Copy this library NPC into the current campaign"
          >
            → Campaign
          </button>
        ) : npc.campaignId === campaignId ? (
          <button
            className="btn-ghost px-2 text-xs"
            onClick={() => onCopy(undefined)}
            title="Copy this NPC into the shared library"
          >
            → Library
          </button>
        ) : null}
        <button className="btn-ghost px-2 text-xs" onClick={() => setSheet(true)} title="Open stat sheet">
          Sheet
        </button>
        <InlineConfirm onConfirm={onDelete} title="Delete NPC" />
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

function GeneratorTab({ campaignId }: { campaignId: string }) {
  const generate = useGenerateNpc();
  const create = useCreateNpc();
  const [culture, setCulture] = useState("");
  const [region, setRegion] = useState("");
  const [role, setRole] = useState("");
  const [count, setCount] = useState(3);
  const [results, setResults] = useState<GeneratedNpc[]>([]);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const roll = () => {
    setSaved(new Set());
    generate.mutate(
      { culture: culture || undefined, region: region || undefined, role: role || undefined, count },
      { onSuccess: (r) => setResults(r.npcs) },
    );
  };

  const save = (n: GeneratedNpc, idx: number) => {
    create.mutate(
      { name: n.name, role: n.role, quirk: n.quirk, hook: n.hook, tags: n.tags, campaignId },
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
      <button
        className="btn-primary mt-2"
        onClick={roll}
        disabled={generate.isPending}
      >
        {generate.isPending ? "Rolling…" : "Roll NPCs"}
      </button>

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
                <span className="text-ink-500">Quirk: </span>
                {n.quirk}
              </div>
              <div>
                <span className="text-ink-500">Hook: </span>
                {n.hook}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {n.tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          </li>
        ))}
        {results.length === 0 && (
          <li className="flex h-full items-center justify-center py-8 text-center text-ink-500">
            Choose a culture and roll some NPCs.
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
  Component: NpcLibraryWidget,
});

export {};
