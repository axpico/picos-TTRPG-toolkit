import { useMemo, useState } from "react";
import { sampleMonsters, type CreateMonsterInput, type Monster } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { InlineConfirm } from "../shared.js";
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

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-2 gap-1.5 border-b border-ink-700 p-2">
        <input
          className="input"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input"
          value={scope}
          onChange={(e) => setScope(e.target.value as "campaign" | "all")}
        >
          <option value="campaign">This campaign</option>
          <option value="all">All</option>
        </select>
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

      <div className="flex items-center justify-between border-b border-ink-700 px-2 py-1.5 text-xs text-ink-400">
        <span>{list.data?.length ?? 0} creatures</span>
        <div className="flex items-center gap-1.5">
          <button
            className="btn-ghost px-2"
            disabled={create.isPending}
            title="Add the SRD sample creatures to this campaign"
            onClick={() => {
              for (const m of sampleMonsters) create.mutate({ ...m, campaignId });
            }}
          >
            Load samples
          </button>
          <button
            className="btn-primary px-2"
            onClick={() =>
              create.mutate({ name: "New creature", campaignId, tags: [] })
            }
          >
            + Add
          </button>
        </div>
      </div>

      <ul className="flex-1 space-y-1 overflow-auto p-2 text-sm">
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
        {list.data?.length === 0 && (
          <li className="text-ink-400">No creatures match your filters.</li>
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

  const s = monster.stats;
  const preview = [
    s.ac != null ? `AC ${s.ac}` : null,
    s.hp != null ? `HP ${s.hp}` : null,
    monster.challenge ? `CR ${monster.challenge}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="rounded-md border border-ink-700 bg-ink-900">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          className="text-ink-500 hover:text-ink-200"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "▾" : "▸"}
        </button>
        {monster.campaignId == null && (
          <span className="chip shrink-0 border-sky-700/60 text-sky-300" title="Shared library creature">
            Lib
          </span>
        )}
        <input
          className="input flex-1"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => localName !== monster.name && onChange({ name: localName })}
        />
        <input
          className="input w-28"
          placeholder="Type"
          value={localType}
          onChange={(e) => setLocalType(e.target.value)}
          onBlur={() =>
            (localType || undefined) !== (monster.type ?? undefined) &&
            onChange({ type: localType || undefined })
          }
        />
        <input
          className="input w-20 text-right"
          placeholder="CR"
          value={localChallenge}
          onChange={(e) => setLocalChallenge(e.target.value)}
          onBlur={() =>
            (localChallenge || undefined) !== (monster.challenge ?? undefined) &&
            onChange({ challenge: localChallenge || undefined })
          }
        />
        {monster.campaignId == null ? (
          <button
            className="btn-ghost px-2 text-xs"
            onClick={() => onCopy(campaignId)}
            title="Copy this library creature into the current campaign"
          >
            → Campaign
          </button>
        ) : monster.campaignId === campaignId ? (
          <button
            className="btn-ghost px-2 text-xs"
            onClick={() => onCopy(undefined)}
            title="Copy this creature into the shared library"
          >
            → Library
          </button>
        ) : null}
        <button className="btn-ghost px-2 text-xs" onClick={() => setSheet(true)} title="Open stat sheet">
          Sheet
        </button>
        <InlineConfirm onConfirm={onDelete} title="Delete creature" />
      </div>
      {open && (
        <div className="space-y-1.5 border-t border-ink-700 px-2 py-2 text-xs">
          {preview && <div className="font-medium text-ink-300">{preview}</div>}
          <input
            className="input"
            placeholder="Environment"
            value={localEnvironment}
            onChange={(e) => setLocalEnvironment(e.target.value)}
            onBlur={() =>
              (localEnvironment || undefined) !== (monster.environment ?? undefined) &&
              onChange({ environment: localEnvironment || undefined })
            }
          />
          <input
            className="input"
            placeholder="Tags (comma-separated)"
            value={localTags}
            onChange={(e) => setLocalTags(e.target.value)}
            onBlur={(e) =>
              onChange({
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <textarea
            className="input min-h-[60px]"
            placeholder="GM notes"
            defaultValue={monster.notes ?? ""}
            onBlur={(e) => onChange({ notes: e.target.value || undefined })}
          />
          <button className="btn-primary w-full px-2 py-1.5" onClick={() => setSheet(true)}>
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

registerWidget({
  type: "bestiary",
  title: "Bestiary",
  defaultSize: { w: 480, h: 440 },
  Component: BestiaryWidget,
});

export {};
