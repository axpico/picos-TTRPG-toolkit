import { useMemo, useState } from "react";
import type { Monster } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
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
      ...(scope === "campaign" ? { campaignId } : {}),
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
        <button
          className="btn-primary px-2"
          onClick={() =>
            create.mutate({ name: "New creature", campaignId, tags: [] })
          }
        >
          + Add
        </button>
      </div>

      <ul className="flex-1 space-y-1 overflow-auto p-2 text-sm">
        {list.data?.map((m) => (
          <MonsterRow
            key={m.id}
            monster={m}
            onChange={(input) => update.mutate({ id: m.id, input })}
            onDelete={() => {
              if (confirm(`Delete "${m.name}" from the bestiary?`)) remove.mutate(m.id);
            }}
          />
        ))}
        {list.data?.length === 0 && (
          <li className="text-ink-400">No creatures match your filters.</li>
        )}
      </ul>
    </div>
  );
}

interface RowProps {
  monster: Monster;
  onChange: (input: Parameters<ReturnType<typeof useUpdateMonster>["mutate"]>[0]["input"]) => void;
  onDelete: () => void;
}

function MonsterRow({ monster, onChange, onDelete }: RowProps) {
  const [open, setOpen] = useState(false);
  const [statsText, setStatsText] = useState(() => JSON.stringify(monster.stats, null, 2));
  const [statsErr, setStatsErr] = useState<string | null>(null);

  const commitStats = () => {
    try {
      const parsed = JSON.parse(statsText || "{}");
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        setStatsErr("Stats must be a JSON object.");
        return;
      }
      onChange({ stats: parsed as Record<string, unknown> });
      setStatsErr(null);
    } catch (e) {
      setStatsErr(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <li className="rounded-md border border-ink-700 bg-ink-900">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          className="text-ink-500 hover:text-ink-200"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "▾" : "▸"}
        </button>
        <input
          className="input flex-1"
          value={monster.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <input
          className="input w-28"
          placeholder="Type"
          value={monster.type ?? ""}
          onChange={(e) => onChange({ type: e.target.value || undefined })}
        />
        <input
          className="input w-20 text-right"
          placeholder="CR"
          value={monster.challenge ?? ""}
          onChange={(e) => onChange({ challenge: e.target.value || undefined })}
        />
        <button className="btn-ghost px-2" onClick={onDelete} title="Delete">
          ×
        </button>
      </div>
      {open && (
        <div className="space-y-1.5 border-t border-ink-700 px-2 py-2 text-xs">
          <input
            className="input"
            placeholder="Environment"
            value={monster.environment ?? ""}
            onChange={(e) => onChange({ environment: e.target.value || undefined })}
          />
          <input
            className="input"
            placeholder="Tags (comma-separated)"
            value={monster.tags.join(", ")}
            onChange={(e) =>
              onChange({
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <textarea
            className="input min-h-[100px] font-mono"
            placeholder='Stats JSON, e.g. {"AC": 14, "HP": 32, "atk": "1d8+3"}'
            value={statsText}
            onChange={(e) => setStatsText(e.target.value)}
            onBlur={commitStats}
          />
          {statsErr && <div className="text-red-400">{statsErr}</div>}
          <textarea
            className="input min-h-[60px]"
            placeholder="GM notes"
            value={monster.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value || undefined })}
          />
        </div>
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
