import { useEffect, useState } from "react";
import clsx from "clsx";
import type { PartyMemberStatus } from "@toolkit/shared";
import { HpBar, PendingButton } from "../modules/shared.js";
import { EmptyState } from "../components/EmptyState.js";
import { Skeleton } from "../components/Skeleton.js";
import { CreatureSheetModal } from "../components/statblock/CreatureSheetModal.js";
import { useMyCharacter, useUpdateMyCharacter } from "./usePlayer.js";
import { addCondition, applyHpDelta, removeCondition } from "./format.js";

const STATUSES: PartyMemberStatus[] = ["active", "down", "stable", "dead"];
const COMMON_CONDITIONS = ["Poisoned", "Prone", "Stunned", "Frightened", "Blinded", "Grappled"];

export function MyCharacterPanel({ campaignId }: { campaignId: string }) {
  const character = useMyCharacter(campaignId);
  const update = useUpdateMyCharacter(campaignId);
  const [amount, setAmount] = useState(1);
  const [notes, setNotes] = useState("");
  const [newCond, setNewCond] = useState("");
  const [sheet, setSheet] = useState(false);

  const c = character.data;
  useEffect(() => {
    if (c) setNotes(c.notes ?? "");
  }, [c]);

  if (character.isLoading) {
    return (
      <section className="card space-y-3 p-4" aria-label="Loading your character">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-6 flex-1" />
        </div>
        <Skeleton className="h-2" />
        <Skeleton className="h-8" />
      </section>
    );
  }
  if (!c) {
    return (
      <section className="card p-4">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-300">My Character</h2>
        <EmptyState
          compact
          icon="🧝"
          title="No character linked"
          description="Ask your GM to link your account to a character — Party widget, 🔗 picker on your character's card. Your sheet then appears here automatically."
        />
      </section>
    );
  }

  const danger = c.status === "down" || c.status === "dead";
  const setHp = (delta: number) => update.mutate({ hp: applyHpDelta(c.hp, c.hpMax, delta) });
  const setConditions = (next: string[]) => update.mutate({ conditions: next });

  return (
    <section className={clsx("card p-4", danger && "border-red-500/60 bg-red-900/10")}>
      <div className="mb-3 flex items-center gap-3">
        {c.portraitAssetId ? (
          <img
            src={`/api/files/${c.portraitAssetId}`}
            alt={c.name}
            className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-ink-700"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-lg font-semibold text-ink-300">
            {c.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="display truncate text-lg font-semibold">{c.name}</h2>
          <span className="font-mono text-sm text-ink-300">{c.hp}/{c.hpMax} HP</span>
        </div>
        <button
          className="btn-ghost h-8 shrink-0 px-2 text-xs"
          onClick={() => setSheet(true)}
          title="View character sheet and roll dice"
        >
          ⚄ Sheet
        </button>
      </div>

      {sheet && (
        <CreatureSheetModal
          open
          onClose={() => setSheet(false)}
          title={c.name}
          subtitle={c.playerName ? `Played by ${c.playerName}` : null}
          campaignId={campaignId}
          rollerName={c.name}
          kind="player"
          stats={c.stats}
          hideHp
          onChange={(next) => update.mutate({ stats: next })}
        />
      )}

      <HpBar hp={c.hp} hpMax={c.hpMax} />

      {/* Damage / heal by N */}
      <div className="mt-3 flex items-center gap-1.5">
        <button className="btn-ghost h-8 px-2" onClick={() => setHp(-1)} title="−1">−</button>
        <input
          type="number"
          min={1}
          className="input h-8 w-16 text-center"
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
        />
        <PendingButton className="btn-danger h-8 flex-1" pending={update.isPending} onClick={() => setHp(-amount)}>
          Damage
        </PendingButton>
        <PendingButton className="btn-primary h-8 flex-1" pending={update.isPending} onClick={() => setHp(amount)}>
          Heal
        </PendingButton>
        <button className="btn-ghost h-8 px-2" onClick={() => setHp(1)} title="+1">＋</button>
      </div>

      {/* Status */}
      <div className="mt-3 flex gap-0.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={clsx(
              "h-7 flex-1 rounded text-xs capitalize",
              c.status === s ? "btn-primary" : "btn-ghost",
            )}
            onClick={() => update.mutate({ status: s })}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Conditions as chips */}
      <label className="mt-3 block text-xs uppercase tracking-wide text-ink-400">Conditions</label>
      <div className="mt-1 flex flex-wrap gap-1">
        {c.conditions.map((cond) => (
          <button
            key={cond}
            className="chip hover:text-red-300"
            onClick={() => setConditions(removeCondition(c.conditions, cond))}
            title="Remove"
          >
            {cond} <span className="text-ink-500">×</span>
          </button>
        ))}
        {c.conditions.length === 0 && <span className="text-xs text-ink-500">None</span>}
      </div>
      <div className="mt-1.5 flex gap-1">
        <input
          className="input h-8"
          placeholder="Add condition…"
          value={newCond}
          onChange={(e) => setNewCond(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newCond.trim()) {
              setConditions(addCondition(c.conditions, newCond));
              setNewCond("");
            }
          }}
        />
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {COMMON_CONDITIONS.filter((q) => !c.conditions.some((x) => x.toLowerCase() === q.toLowerCase())).map((q) => (
          <button
            key={q}
            className="rounded-full border border-ink-700/60 px-2 py-0.5 text-xs text-ink-400 hover:border-accent-500 hover:text-ink-100"
            onClick={() => setConditions(addCondition(c.conditions, q))}
          >
            + {q}
          </button>
        ))}
      </div>

      {/* Notes */}
      <label className="mt-3 block text-xs uppercase tracking-wide text-ink-400">Notes</label>
      <textarea
        className="input mt-1 min-h-[60px]"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== (c.notes ?? "") && update.mutate({ notes })}
      />
    </section>
  );
}
