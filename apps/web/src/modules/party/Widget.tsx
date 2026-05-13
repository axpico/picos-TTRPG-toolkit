import { useState } from "react";
import clsx from "clsx";
import type { PartyMember, PartyMemberStatus } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import {
  useCreatePartyMember,
  useDeletePartyMember,
  useParty,
  useUpdatePartyMember,
} from "./api.js";

const STATUS_LABEL: Record<PartyMemberStatus, string> = {
  active: "Active",
  down: "Down",
  stable: "Stable",
  dead: "Dead",
};

const STATUS_STYLE: Record<PartyMemberStatus, string> = {
  active: "bg-emerald-700/50 text-emerald-100",
  down: "bg-amber-700/50 text-amber-100",
  stable: "bg-sky-700/50 text-sky-100",
  dead: "bg-red-800/50 text-red-100",
};

function PartyTrackerWidget({ campaignId }: WidgetContext) {
  const list = useParty(campaignId);
  const create = useCreatePartyMember(campaignId);
  const update = useUpdatePartyMember(campaignId);
  const remove = useDeletePartyMember(campaignId);
  const [adding, setAdding] = useState("");

  const addMember = () => {
    const name = adding.trim();
    if (!name) return;
    create.mutate({ name }, { onSuccess: () => setAdding("") });
  };

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex gap-1">
        <input
          className="input"
          placeholder="Add member by name…"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addMember()}
        />
        <button
          className="btn-primary"
          disabled={create.isPending || !adding.trim()}
          onClick={addMember}
        >
          Add
        </button>
      </div>

      <ul className="flex-1 space-y-1.5 overflow-auto">
        {list.data?.map((m) => (
          <Row
            key={m.id}
            member={m}
            onChange={(input) => update.mutate({ id: m.id, input })}
            onDelete={() => {
              if (confirm(`Remove ${m.name} from the party?`)) remove.mutate(m.id);
            }}
          />
        ))}
        {list.data?.length === 0 && (
          <li className="text-sm text-ink-400">No party members yet.</li>
        )}
      </ul>
    </div>
  );
}

interface RowProps {
  member: PartyMember;
  onChange: (input: Parameters<ReturnType<typeof useUpdatePartyMember>["mutate"]>[0]["input"]) => void;
  onDelete: () => void;
}

function Row({ member, onChange, onDelete }: RowProps) {
  return (
    <li className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <input
          className="input flex-1"
          value={member.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <input
          type="number"
          className="input w-16 text-right"
          value={member.hp}
          onChange={(e) => onChange({ hp: Number(e.target.value) })}
          title="Current HP"
        />
        <span className="text-ink-500">/</span>
        <input
          type="number"
          className="input w-16 text-right"
          value={member.hpMax}
          onChange={(e) => onChange({ hpMax: Number(e.target.value) })}
          title="Max HP"
        />
        <button className="btn-ghost px-2" onClick={onDelete} title="Remove">
          ×
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        {(["active", "down", "stable", "dead"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ status: s })}
            className={clsx(
              "rounded-full px-2 py-0.5",
              member.status === s
                ? STATUS_STYLE[s]
                : "bg-ink-800 text-ink-300 hover:bg-ink-700",
            )}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        <input
          className="input ml-1 flex-1 text-xs"
          placeholder="Conditions (comma-separated)"
          value={member.conditions.join(", ")}
          onChange={(e) =>
            onChange({
              conditions: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    </li>
  );
}

registerWidget({
  type: "party",
  title: "Party Tracker",
  defaultSize: { w: 380, h: 360 },
  broadcastKey: "party",
  Component: PartyTrackerWidget,
});

export {};
