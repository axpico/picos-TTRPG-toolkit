import { useMemo, useState } from "react";
import { sampleMonsters, type CreateMonsterInput, type Monster } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { InlineConfirm, MetaChip, ScopeToggle, SearchInput } from "../shared.js";
import { CreatureSheetModal } from "../../components/statblock/CreatureSheetModal.js";
import {
  useCreateMonster,
  useDeleteMonster,
  useMonsters,
  useUpdateMonster,
} from "./api.js";

function BestiaryWidget({ campaignId }: WidgetContext) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"campaign" | "all">("campaign");
  const [type, setType] = useState("");
  const [environment, setEnvironment] = useState("");

  const filters = useMemo(
    () => ({
      campaignId,
      ...(scope === "all" ? { includeGlobal: true } : {}),
      q: q.trim() || undefined,
      type: type.trim() || undefined,
      environment: environment.trim() || undefined,
    }),
    [campaignId, scope, q, type, environment],
  );

  const list = useMonsters(filters);
  const create = useCreateMonster();
  const update = useUpdateMonster();
  const remove = useDeleteMonster();

  const count = list.data?.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="space-y-2 border-b border-ink-700 p-2">
        <div className="flex items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search creatures…" />
          <ScopeToggle value={scope} onChange={setScope} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <input
            className="input"
            placeholder="Type (e.g. fiend)"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <input
            className="input"
            placeholder="Environment (e.g. forest)"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-2 border-b border-ink-700 px-2 py-1.5">
        <span className="text-xs text-ink-400">
          {list.isLoading ? "Loading…" : `${count} ${count === 1 ? "creature" : "creatures"}`}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            className="btn-ghost h-7 px-2 text-xs"
            disabled={create.isPending}
            title="Add the SRD sample creatures to this campaign"
            onClick={() => {
              for (const m of sampleMonsters) create.mutate({ ...m, campaignId });
            }}
          >
            Load samples
          </button>
          <button
            className="btn-primary h-7 px-2.5 text-xs"
            onClick={() => create.mutate({ name: "New creature", campaignId, tags: [] })}
          >
            + Add
          </button>
        </div>
      </div>

      <ul className="flex-1 space-y-1.5 overflow-auto p-2">
        {list.data?.map((m) => (
          <MonsterRow
            key={m.id}
            monster={m}
            campaignId={campaignId}
            onChange={(input) => update.mutate({ id: m.id, input })}
            onDelete={() => remove.mutate(m.id)}
            onCopy={(target) =>
              create.mutate({ ...monsterToCreateInput(m), campaignId: target })
            }
          />
        ))}
        {!list.isLoading && count === 0 && (
          <li className="flex flex-col items-center gap-1 py-10 text-center">
            <span className="text-2xl opacity-40">🐉</span>
            <span className="text-sm text-ink-400">No creatures match your filters.</span>
            <span className="text-xs text-ink-500">
              Use <span className="text-ink-300">+ Add</span> or{" "}
              <span className="text-ink-300">Load samples</span> to get started.
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

/** Build a create payload from an existing creature, for copying between scopes. */
function monsterToCreateInput(m: Monster): Omit<CreateMonsterInput, "campaignId"> {
  return {
    name: m.name,
    type: m.type ?? undefined,
    environment: m.environment ?? undefined,
    challenge: m.challenge ?? undefined,
    stats: m.stats,
    notes: m.notes ?? undefined,
    tags: m.tags,
  };
}

interface RowProps {
  monster: Monster;
  campaignId: string;
  onChange: (input: Parameters<ReturnType<typeof useUpdateMonster>["mutate"]>[0]["input"]) => void;
  onDelete: () => void;
  /** Copy this creature into the given scope (campaign id, or undefined for the global library). */
  onCopy: (target: string | undefined) => void;
}

function MonsterRow({ monster, campaignId, onChange, onDelete, onCopy }: RowProps) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [localName, setLocalName] = useState(monster.name);
  const [localType, setLocalType] = useState(monster.type ?? "");
  const [localChallenge, setLocalChallenge] = useState(monster.challenge ?? "");
  const [localEnvironment, setLocalEnvironment] = useState(monster.environment ?? "");
  const [localTags, setLocalTags] = useState(monster.tags.join(", "));

  const isLibrary = monster.campaignId == null;
  const s = monster.stats;
  const preview = [
    s.ac != null ? `AC ${s.ac}` : null,
    s.hp != null ? `HP ${s.hp}` : null,
    monster.challenge ? `CR ${monster.challenge}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="overflow-hidden rounded-lg border border-ink-700 bg-ink-900 transition-colors hover:border-ink-600">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button
          className="shrink-0 text-ink-500 transition-colors hover:text-ink-200"
          onClick={() => setOpen((v) => !v)}
          title={open ? "Collapse" : "Expand"}
        >
          {open ? "▾" : "▸"}
        </button>
        {isLibrary && (
          <span
            className="chip shrink-0 border-sky-700/60 bg-sky-900/30 text-sky-300"
            title="Shared library creature"
          >
            Lib
          </span>
        )}
        <input
          className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-ink-50 transition-colors hover:border-ink-700 focus:border-accent-500 focus:bg-ink-950 focus:outline-none focus:ring-1 focus:ring-accent-500"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => localName !== monster.name && onChange({ name: localName })}
          placeholder="Name"
        />
        {monster.type && <MetaChip title="Type">{monster.type}</MetaChip>}
        {monster.challenge && (
          <MetaChip title="Challenge rating" className="bg-amber-900/30 text-amber-300">
            CR {monster.challenge}
          </MetaChip>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <CopyButton isLibrary={isLibrary} sameCampaign={monster.campaignId === campaignId} onCopy={onCopy} campaignId={campaignId} />
          <button
            className="btn-ghost h-7 px-2 text-xs"
            onClick={() => setSheet(true)}
            title="Open stat sheet"
          >
            Sheet
          </button>
          <InlineConfirm onConfirm={onDelete} title="Delete creature" />
        </div>
      </div>

      {open && (
        <div className="space-y-2 border-t border-ink-700 bg-ink-950/40 px-2.5 py-2.5 text-xs">
          {preview && <div className="font-medium text-ink-300">{preview}</div>}
          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex flex-col gap-0.5">
              <span className="text-ink-500">Type</span>
              <input
                className="input"
                placeholder="e.g. fiend"
                value={localType}
                onChange={(e) => setLocalType(e.target.value)}
                onBlur={() =>
                  (localType || undefined) !== (monster.type ?? undefined) &&
                  onChange({ type: localType || undefined })
                }
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-ink-500">Challenge</span>
              <input
                className="input"
                placeholder="CR"
                value={localChallenge}
                onChange={(e) => setLocalChallenge(e.target.value)}
                onBlur={() =>
                  (localChallenge || undefined) !== (monster.challenge ?? undefined) &&
                  onChange({ challenge: localChallenge || undefined })
                }
              />
            </label>
          </div>
          <label className="flex flex-col gap-0.5">
            <span className="text-ink-500">Environment</span>
            <input
              className="input"
              placeholder="e.g. forest"
              value={localEnvironment}
              onChange={(e) => setLocalEnvironment(e.target.value)}
              onBlur={() =>
                (localEnvironment || undefined) !== (monster.environment ?? undefined) &&
                onChange({ environment: localEnvironment || undefined })
              }
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-ink-500">Tags</span>
            <input
              className="input"
              placeholder="comma, separated"
              value={localTags}
              onChange={(e) => setLocalTags(e.target.value)}
              onBlur={(e) =>
                onChange({
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-ink-500">GM notes</span>
            <textarea
              className="input min-h-[60px]"
              placeholder="Private notes…"
              defaultValue={monster.notes ?? ""}
              onBlur={(e) => onChange({ notes: e.target.value || undefined })}
            />
          </label>
          <button className="btn-primary w-full py-1.5" onClick={() => setSheet(true)}>
            Open stat sheet
          </button>
        </div>
      )}

      {sheet && (
        <CreatureSheetModal
          open
          onClose={() => setSheet(false)}
          title={monster.name}
          subtitle={[monster.type, monster.environment].filter(Boolean).join(" · ") || null}
          cr={monster.challenge}
          stats={monster.stats}
          onChange={(next) => onChange({ stats: next })}
        />
      )}
    </li>
  );
}

/** Copy-between-scopes action. Library entries import into the campaign; campaign entries publish to the library. */
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
        title="Copy this library creature into the current campaign"
      >
        ↘ Import
      </button>
    );
  if (sameCampaign)
    return (
      <button
        className="btn-ghost h-7 gap-1 px-2 text-xs"
        onClick={() => onCopy(undefined)}
        title="Copy this creature into the shared library"
      >
        ↗ Library
      </button>
    );
  return null;
}

registerWidget({
  type: "bestiary",
  title: "Bestiary",
  defaultSize: { w: 480, h: 440 },
  Component: BestiaryWidget,
});

export {};
