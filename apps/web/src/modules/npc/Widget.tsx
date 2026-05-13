import { useMemo, useState } from "react";
import clsx from "clsx";
import type { GeneratedNpc, NPC } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import {
  useCreateNpc,
  useDeleteNpc,
  useGenerateNpc,
  useNpcs,
  useUpdateNpc,
} from "./api.js";

type Tab = "library" | "generator";

function NpcLibraryWidget({ campaignId, state, setState }: WidgetContext) {
  const tab = (state?.tab as Tab | undefined) ?? "library";
  const setTab = (t: Tab) => setState({ tab: t });

  return (
    <div className="flex h-full flex-col">
      <nav className="flex gap-1 border-b border-ink-700 px-2 py-1.5 text-sm">
        <button
          className={clsx("btn px-2", tab === "library" ? "btn-primary" : "btn-ghost")}
          onClick={() => setTab("library")}
        >
          Library
        </button>
        <button
          className={clsx("btn px-2", tab === "generator" ? "btn-primary" : "btn-ghost")}
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
      ...(scope === "campaign" ? { campaignId } : {}),
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
          placeholder="Search name/role/notes…"
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
        <label className="flex items-center gap-1 text-xs text-ink-300">
          <input
            type="checkbox"
            checked={onlyFavorites}
            onChange={(e) => setOnlyFavorites(e.target.checked)}
          />
          ★
        </label>
        <button
          className="btn-primary px-2"
          onClick={() =>
            create.mutate({ name: "New NPC", campaignId, tags: [] })
          }
        >
          +
        </button>
      </div>

      <ul className="flex-1 space-y-1 overflow-auto p-2 text-sm">
        {list.data?.map((n) => (
          <NpcRow
            key={n.id}
            npc={n}
            onChange={(input) => update.mutate({ id: n.id, input })}
            onDelete={() => {
              if (confirm(`Delete NPC "${n.name}"?`)) remove.mutate(n.id);
            }}
          />
        ))}
        {list.data?.length === 0 && (
          <li className="text-ink-400">No NPCs match your filters.</li>
        )}
      </ul>
    </div>
  );
}

interface RowProps {
  npc: NPC;
  onChange: (input: Parameters<ReturnType<typeof useUpdateNpc>["mutate"]>[0]["input"]) => void;
  onDelete: () => void;
}

function NpcRow({ npc, onChange, onDelete }: RowProps) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-md border border-ink-700 bg-ink-900">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          className="text-ink-500 hover:text-ink-200"
          onClick={() => setOpen((v) => !v)}
          title={open ? "Collapse" : "Expand"}
        >
          {open ? "▾" : "▸"}
        </button>
        <input
          className="input flex-1"
          value={npc.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <input
          className="input w-32"
          placeholder="Role"
          value={npc.role ?? ""}
          onChange={(e) => onChange({ role: e.target.value || undefined })}
        />
        <button
          className={clsx(
            "btn h-7 px-2",
            npc.favorite ? "bg-amber-700 text-amber-100" : "bg-ink-700 text-ink-200",
          )}
          onClick={() => onChange({ favorite: !npc.favorite })}
          title="Favorite"
        >
          ★
        </button>
        <button className="btn-ghost px-2" onClick={onDelete} title="Delete">
          ×
        </button>
      </div>
      {open && (
        <div className="space-y-1.5 border-t border-ink-700 px-2 py-2 text-xs">
          <input
            className="input"
            placeholder="Quirk"
            value={npc.quirk ?? ""}
            onChange={(e) => onChange({ quirk: e.target.value || undefined })}
          />
          <input
            className="input"
            placeholder="Hook"
            value={npc.hook ?? ""}
            onChange={(e) => onChange({ hook: e.target.value || undefined })}
          />
          <textarea
            className="input min-h-[80px]"
            placeholder="Notes"
            value={npc.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value || undefined })}
          />
          <input
            className="input"
            placeholder="Tags (comma-separated)"
            value={npc.tags.join(", ")}
            onChange={(e) =>
              onChange({
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
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

  const roll = () =>
    generate.mutate(
      {
        culture: culture || undefined,
        region: region || undefined,
        role: role || undefined,
        count,
      },
      { onSuccess: (r) => setResults(r.npcs) },
    );

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-2 text-sm">
      <div className="grid grid-cols-2 gap-1.5">
        <input
          className="input"
          placeholder="Culture (generic|northern|desert|imperial|spacer)"
          value={culture}
          onChange={(e) => setCulture(e.target.value)}
        />
        <input
          className="input"
          placeholder="Region tag (optional)"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
        <input
          className="input"
          placeholder="Force role (optional)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <input
          type="number"
          className="input"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
        />
      </div>
      <button
        className="btn-primary mt-2"
        onClick={roll}
        disabled={generate.isPending}
      >
        Roll NPCs
      </button>

      <ul className="mt-2 flex-1 space-y-1.5 overflow-auto">
        {results.map((n, idx) => (
          <li
            key={idx}
            className="flex flex-col gap-1 rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {n.name} <span className="text-ink-400">— {n.role}</span>
              </span>
              <button
                className="btn-ghost h-7 px-2 text-xs"
                onClick={() =>
                  create.mutate({
                    name: n.name,
                    role: n.role,
                    quirk: n.quirk,
                    hook: n.hook,
                    tags: n.tags,
                    campaignId,
                  })
                }
              >
                Save to library
              </button>
            </div>
            <div className="text-xs text-ink-300">
              <div>
                <span className="text-ink-500">Quirk:</span> {n.quirk}
              </div>
              <div>
                <span className="text-ink-500">Hook:</span> {n.hook}
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
          <li className="py-4 text-center text-ink-400">No NPCs yet — roll some up.</li>
        )}
      </ul>
    </div>
  );
}

registerWidget({
  type: "npc",
  title: "NPC Library",
  defaultSize: { w: 460, h: 440 },
  Component: NpcLibraryWidget,
});

export {};
