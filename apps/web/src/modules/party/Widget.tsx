import { useEffect, useState } from "react";
import clsx from "clsx";
import { sampleParty, type PartyMember, type PartyMemberStatus } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { HpBar, InlineConfirm, PendingButton } from "../shared.js";
import { Skeleton } from "../../components/Skeleton.js";
import { EmptyState } from "../../components/EmptyState.js";
import { CreatureSheetModal } from "../../components/statblock/CreatureSheetModal.js";
import {
  useCampaignMembers,
  useCreatePartyMember,
  useDeletePartyMember,
  useParty,
  useUpdatePartyMember,
  type CampaignMember,
} from "./api.js";

const STATUS_LABEL: Record<PartyMemberStatus, string> = {
  active: "Active",
  down: "Down",
  stable: "Stable",
  dead: "Dead",
};

const STATUS_STYLE: Record<PartyMemberStatus, string> = {
  active: "bg-emerald-700/50 text-emerald-200",
  down: "bg-amber-700/50 text-amber-200",
  stable: "bg-sky-700/50 text-sky-200",
  dead: "bg-red-900/60 text-red-300",
};

function PartyTrackerWidget({ campaignId }: WidgetContext) {
  const list = useParty(campaignId);
  const members = useCampaignMembers(campaignId);
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
          placeholder="Character name…"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addMember()}
          autoComplete="off"
        />
        <PendingButton
          className="btn-primary"
          pending={create.isPending}
          disabled={!adding.trim()}
          onClick={addMember}
        >
          Add
        </PendingButton>
        <button
          className="btn-ghost whitespace-nowrap"
          disabled={create.isPending}
          title="Add a sample SRD party to this campaign"
          onClick={() => {
            for (const m of sampleParty) create.mutate(m);
          }}
        >
          Load samples
        </button>
      </div>

      <ul className="flex-1 space-y-2 overflow-auto">
        {list.isLoading && (
          <li aria-hidden="true" className="space-y-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </li>
        )}
        {list.data?.map((m) => (
          <PartyMemberRow
            key={m.id}
            member={m}
            campaignId={campaignId}
            accounts={members.data ?? []}
            onChange={(input) => update.mutate({ id: m.id, input })}
            onDelete={() => remove.mutate(m.id)}
          />
        ))}
        {list.data?.length === 0 && (
          <li>
            <EmptyState
              compact
              icon="🛡️"
              title="No party members yet"
              description="Add a character above, or load the sample party."
            />
          </li>
        )}
      </ul>
    </div>
  );
}

interface PartyMemberRowProps {
  member: PartyMember;
  campaignId: string;
  /** Campaign accounts, for linking this character to a player. */
  accounts: CampaignMember[];
  onChange: (
    input: Parameters<ReturnType<typeof useUpdatePartyMember>["mutate"]>[0]["input"],
  ) => void;
  onDelete: () => void;
}

function PartyMemberRow({ member, campaignId, accounts, onChange, onDelete }: PartyMemberRowProps) {
  const [localName, setLocalName] = useState(member.name);
  const [localPlayer, setLocalPlayer] = useState(member.playerName ?? "");
  const [localHp, setLocalHp] = useState(member.hp ?? 0);
  const [localHpMax, setLocalHpMax] = useState(member.hpMax ?? 0);
  const [localGold, setLocalGold] = useState(member.gold ?? 0);
  const [localConditions, setLocalConditions] = useState(member.conditions.join(", "));
  const [dmgInput, setDmgInput] = useState("");
  const [sheet, setSheet] = useState(false);

  useEffect(() => setLocalHp(member.hp ?? 0), [member.hp]);
  useEffect(() => setLocalHpMax(member.hpMax ?? 0), [member.hpMax]);
  useEffect(() => setLocalGold(member.gold ?? 0), [member.gold]);
  useEffect(() => setLocalConditions(member.conditions.join(", ")), [member.conditions]);

  const isDead = member.status === "dead";

  const stepHp = (delta: number) => {
    const next = Math.max(0, localHp + delta);
    setLocalHp(next);
    onChange({ hp: next });
  };

  const applyDmg = (sign: 1 | -1) => {
    const n = Number(dmgInput);
    if (!n || Number.isNaN(n)) return;
    const next = Math.max(0, localHp + sign * -n);
    setLocalHp(next);
    onChange({ hp: next });
    setDmgInput("");
  };

  return (
    <li
      className={clsx(
        "rounded-md border bg-ink-900 px-2 py-2 transition-opacity",
        isDead ? "border-ink-800 opacity-55" : "border-ink-700",
      )}
    >
      {/* Name + player + delete */}
      <div className="flex items-center gap-1.5">
        <input
          className="input flex-1 font-medium"
          value={localName}
          placeholder="Name"
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => {
            const v = localName.trim();
            if (v && v !== member.name) onChange({ name: v });
          }}
        />
        <input
          className="input w-24 text-xs text-ink-400"
          value={localPlayer}
          placeholder="Player"
          onChange={(e) => setLocalPlayer(e.target.value)}
          onBlur={() => {
            const v = localPlayer.trim() || undefined;
            if (v !== (member.playerName ?? undefined)) onChange({ playerName: v });
          }}
        />
        <button className="btn-ghost px-2 text-xs" onClick={() => setSheet(true)} title="Open character sheet">
          Sheet
        </button>
        <InlineConfirm onConfirm={onDelete} title="Remove from party" />
      </div>

      {/* Link to a player account — enables the player's self-service "My Character" panel. */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className={clsx("w-5 text-center text-xs", member.userId ? "text-accent-400" : "text-ink-500")}
          title={member.userId ? "Linked to a player account" : "Not linked to a player account"}
          aria-hidden="true"
        >
          🔗
        </span>
        <select
          className="input flex-1 text-xs"
          value={member.userId ?? ""}
          aria-label={`Linked player account for ${member.name}`}
          title="Link this character to a player account so they can manage HP, conditions and notes from the player view"
          onChange={(e) => onChange({ userId: e.target.value || null })}
        >
          <option value="">Not linked — player can't self-manage</option>
          {accounts.map((a) => (
            <option key={a.userId} value={a.userId}>
              {(a.user.displayName?.trim() || a.user.username) + (a.role === "dm" ? " (DM)" : "")}
            </option>
          ))}
        </select>
      </div>

      {sheet && (
        <CreatureSheetModal
          open
          onClose={() => setSheet(false)}
          title={member.name}
          subtitle={member.playerName ? `Played by ${member.playerName}` : null}
          campaignId={campaignId}
          rollerName={member.name}
          kind="player"
          stats={member.stats}
          hideHp
          onChange={(next) => onChange({ stats: next })}
        />
      )}

      {/* HP row */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="w-5 text-xs font-medium text-ink-400">HP</span>
        <button
          className="btn-ghost h-6 w-6 p-0 text-base leading-none"
          onClick={() => stepHp(-1)}
          title="−1 HP"
          aria-label="Decrease HP by 1"
        >
          −
        </button>
        <input
          type="number"
          className="input w-14 text-center font-mono text-sm"
          value={localHp}
          onChange={(e) => setLocalHp(Number(e.target.value))}
          onBlur={() => localHp !== (member.hp ?? 0) && onChange({ hp: localHp })}
          title="Current HP"
        />
        <span className="text-ink-500" aria-hidden="true">/</span>
        <input
          type="number"
          className="input w-14 text-center font-mono text-sm text-ink-300"
          value={localHpMax}
          onChange={(e) => setLocalHpMax(Number(e.target.value))}
          onBlur={() => localHpMax !== (member.hpMax ?? 0) && onChange({ hpMax: localHpMax })}
          title="Max HP"
        />
        <button
          className="btn-ghost h-6 w-6 p-0 text-base leading-none"
          onClick={() => stepHp(1)}
          title="+1 HP"
          aria-label="Increase HP by 1"
        >
          +
        </button>
        <span className="ml-auto font-mono text-xs text-ink-400">
          {member.hpMax && member.hpMax > 0
            ? `${Math.round(((member.hp ?? 0) / member.hpMax) * 100)}%`
            : ""}
        </span>
      </div>

      {/* HP bar */}
      <div className="mt-1">
        <HpBar hp={member.hp} hpMax={member.hpMax} />
      </div>

      {/* Quick damage / heal */}
      <div className="mt-1.5 flex items-center gap-1">
        <span className="w-5 text-xs font-medium text-ink-400">dmg</span>
        <input
          type="number"
          className="input w-14 text-center font-mono text-xs"
          placeholder="0"
          value={dmgInput}
          onChange={(e) => setDmgInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyDmg(1)}
          title="Enter amount, Enter to apply damage"
        />
        <button
          className="btn-ghost h-6 px-1.5 text-xs text-red-400 hover:text-red-300"
          onClick={() => applyDmg(1)}
          disabled={!dmgInput}
          title="Apply damage"
        >
          Dmg
        </button>
        <button
          className="btn-ghost h-6 px-1.5 text-xs text-emerald-400 hover:text-emerald-300"
          onClick={() => applyDmg(-1)}
          disabled={!dmgInput}
          title="Heal"
        >
          Heal
        </button>
      </div>

      {/* Gold (spent by the Shop widget on purchase) */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="w-5 text-xs font-medium text-amber-400" title="Gold">⛁</span>
        <input
          type="number"
          className="input w-24 text-center font-mono text-xs text-amber-200"
          value={localGold}
          min={0}
          onChange={(e) => setLocalGold(Number(e.target.value))}
          onBlur={() =>
            localGold !== (member.gold ?? 0) && onChange({ gold: Math.max(0, localGold) })
          }
          title="Gold"
        />
        <span className="text-xs text-ink-500">gp</span>
      </div>

      {/* Status buttons + conditions */}
      <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
        {(["active", "down", "stable", "dead"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ status: s })}
            className={clsx(
              "rounded-full px-2 py-0.5 transition-colors",
              member.status === s ? STATUS_STYLE[s] : "bg-ink-800 text-ink-400 hover:bg-ink-700",
            )}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        <input
          className="input ml-1 flex-1 min-w-0 text-xs"
          placeholder="Conditions…"
          value={localConditions}
          onChange={(e) => setLocalConditions(e.target.value)}
          onBlur={(e) =>
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
  defaultSize: { w: 420, h: 460 },
  broadcastKey: "party",
  Component: PartyTrackerWidget,
});

export {};
