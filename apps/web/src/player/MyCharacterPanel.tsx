import { useEffect, useState } from "react";
import clsx from "clsx";
import type { PartyMemberStatus } from "@toolkit/shared";
import { HpBar } from "../modules/shared.js";
import { useMyCharacter, useUpdateMyCharacter } from "./usePlayer.js";

const STATUSES: PartyMemberStatus[] = ["active", "down", "stable", "dead"];

export function MyCharacterPanel({ campaignId }: { campaignId: string }) {
  const character = useMyCharacter(campaignId);
  const update = useUpdateMyCharacter(campaignId);
  const [conditions, setConditions] = useState("");
  const [notes, setNotes] = useState("");

  const c = character.data;
  useEffect(() => {
    if (c) {
      setConditions(c.conditions.join(", "));
      setNotes(c.notes ?? "");
    }
  }, [c]);

  if (character.isLoading) {
    return <section className="card p-4 text-sm text-ink-400">Loading your character…</section>;
  }
  if (!c) {
    return (
      <section className="card p-4">
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-ink-300">My Character</h2>
        <p className="text-sm text-ink-400">
          No character assigned yet. Ask your DM to link a party member to you.
        </p>
      </section>
    );
  }

  const setHp = (hp: number) => update.mutate({ hp: Math.max(0, hp) });

  return (
    <section className="card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="display text-lg font-semibold">{c.name}</h2>
        <span className="font-mono text-sm text-ink-300">{c.hp}/{c.hpMax}</span>
      </div>
      <HpBar hp={c.hp} hpMax={c.hpMax} />

      <div className="mt-3 flex items-center gap-1">
        <button className="btn-ghost h-7 px-2" onClick={() => setHp(c.hp - 1)} disabled={c.hp <= 0}>−</button>
        <button className="btn-ghost h-7 px-2" onClick={() => setHp(c.hp + 1)}>＋</button>
        <div className="ml-3 flex gap-0.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={clsx("h-7 rounded px-2 text-xs capitalize", c.status === s ? "btn-primary" : "btn-ghost")}
              onClick={() => update.mutate({ status: s })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-3 block text-xs uppercase tracking-wide text-ink-400">Conditions</label>
      <input
        className="input mt-1"
        placeholder="poisoned, prone…"
        value={conditions}
        onChange={(e) => setConditions(e.target.value)}
        onBlur={() =>
          update.mutate({
            conditions: conditions.split(",").map((x) => x.trim()).filter(Boolean),
          })
        }
      />

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
