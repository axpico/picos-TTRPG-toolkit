import { useState } from "react";
import clsx from "clsx";
import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  abilityCheckNotation,
  abilityMod,
  formatMod,
  hitDieFor,
  initiativeNotation,
  parseAction,
  parseModifierList,
  type StatBlock,
} from "@toolkit/shared";
import type { RollArgs } from "./useSheetRoll.js";

const ABILITY_LABEL: Record<string, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

type AdvMode = "normal" | "adv" | "dis";
type Roll = (args: RollArgs) => void;

/** A d20-roll dispatcher: resolves advantage from a modifier-key override or the
 *  sticky mode toggle, labels the result, and fires the roll. */
type FireD20 = (notation: string, label: string, e?: { shiftKey: boolean; altKey: boolean }) => void;

function Line({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="text-sm leading-snug">
      <span className="font-semibold text-ink-200">{label} </span>
      <span className="text-ink-300">{value}</span>
    </p>
  );
}

/** A save/skill rendered as a rollable chip, or plain text when not rollable. */
function ModChips({
  label,
  text,
  fire,
  who,
}: {
  label: string;
  text: string | null;
  fire?: FireD20;
  who: string;
}) {
  const parsed = parseModifierList(text);
  if (!text) return null;
  if (!fire || parsed.length === 0) return <Line label={label} value={text} />;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-sm leading-relaxed">
      <span className="font-semibold text-ink-200">{label} </span>
      {parsed.map((p, i) => (
        <button
          key={`${p.name}-${i}`}
          className="chip cursor-pointer border-accent-700/50 bg-accent-900/20 text-accent-200 transition-colors hover:bg-accent-700/40"
          title={`Roll ${p.name} (Shift = advantage, Alt = disadvantage)`}
          onClick={(e) => fire(`1d20${p.mod >= 0 ? `+${p.mod}` : p.mod}`, `${who} ${p.name}`, e)}
        >
          {p.name} {formatMod(p.mod)}
        </button>
      ))}
    </p>
  );
}

function EntryList({
  title,
  entries,
  fire,
  onRoll,
  who,
}: {
  title: string;
  entries: StatBlock["actions"];
  fire?: FireD20;
  onRoll?: Roll;
  who: string;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="mt-3">
      <h4 className="display mb-1 border-b border-accent-500/30 pb-0.5 text-sm font-semibold uppercase tracking-wide text-accent-400">
        {title}
      </h4>
      <div className="space-y-2">
        {entries.map((e) => {
          const parsed = onRoll ? parseAction(e.desc) : { damage: [] as { notation: string; type?: string }[] };
          const hasRolls = onRoll && (parsed.toHit != null || parsed.damage.length > 0);
          return (
            <div key={e.id} className="text-sm leading-snug text-ink-300">
              <p>
                {e.name && <span className="font-semibold italic text-ink-100">{e.name}. </span>}
                {e.desc}
              </p>
              {hasRolls && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {parsed.toHit != null && (
                    <button
                      className="chip cursor-pointer border-accent-700/50 bg-accent-900/20 text-accent-200 hover:bg-accent-700/40"
                      title="Roll to hit (Shift = advantage, Alt = disadvantage)"
                      onClick={(ev) =>
                        fire!(
                          `1d20${parsed.toHit! >= 0 ? `+${parsed.toHit}` : parsed.toHit}`,
                          `${who} — ${e.name || "Attack"} to hit`,
                          ev,
                        )
                      }
                    >
                      🎲 {formatMod(parsed.toHit)} to hit
                    </button>
                  )}
                  {parsed.damage.map((d, i) => (
                    <button
                      key={i}
                      className="chip cursor-pointer border-rose-700/50 bg-rose-900/20 text-rose-200 hover:bg-rose-700/40"
                      title={`Roll ${d.notation} damage`}
                      onClick={() =>
                        onRoll!({
                          notation: d.notation,
                          label: `${who} — ${e.name || "Attack"} damage${d.type ? ` (${d.type})` : ""}`,
                        })
                      }
                    >
                      🗡 {d.notation}
                      {d.type ? ` ${d.type}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Read advantage/disadvantage from modifier keys on a click event. */
function advFromEvent(e: { shiftKey: boolean; altKey: boolean }): "adv" | "dis" | undefined {
  if (e.shiftKey) return "adv";
  if (e.altKey) return "dis";
  return undefined;
}

/**
 * The read-mode stat block. When `onRoll` is supplied (a campaign context), the
 * ability cells, saves, skills, actions, initiative, and HP become clickable to
 * roll dice; otherwise it renders as a plain classic stat block. A Normal/Adv/Dis
 * toggle controls advantage for every d20 roll; Shift/Alt-click overrides it.
 */
export function RollableStatBlockView({
  stats,
  name,
  who: whoProp,
  cr,
  meta,
  portraitUrl,
  onRoll,
}: {
  stats: StatBlock;
  /** Optional heading shown inside the card. */
  name?: string;
  /** Name used to label rolls (defaults to `name`). */
  who?: string;
  cr?: string | null;
  meta?: string | null;
  portraitUrl?: string | null;
  onRoll?: Roll;
}) {
  const who = whoProp || name || "Creature";
  const [advMode, setAdvMode] = useState<AdvMode>("normal");

  // Dispatcher for d20 rolls: a modifier-key press overrides the sticky toggle,
  // and the chosen mode is reflected in the roll's label so it's visible.
  const fire: FireD20 | undefined = onRoll
    ? (notation, label, e) => {
        const advantage = (e && advFromEvent(e)) ?? (advMode === "normal" ? undefined : advMode);
        const suffix = advantage === "adv" ? " (adv)" : advantage === "dis" ? " (dis)" : "";
        onRoll({ notation, label: label + suffix, advantage });
      }
    : undefined;

  const crValue = stats.cr ?? cr ?? null;
  const topLine = [
    stats.level != null ? `Level ${stats.level}` : null,
    crValue ? `CR ${crValue}` : null,
    stats.ac != null ? `AC ${stats.ac}` : null,
    stats.hp != null ? `HP ${stats.hp}${stats.hpMax ? `/${stats.hpMax}` : ""}` : null,
    stats.speed ? `Speed ${stats.speed}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");

  const crForDice = crValue ?? (stats.level != null ? String(stats.level) : "1");
  const hitDie = hitDieFor(crForDice, stats.level != null ? "npc" : "beast");

  return (
    <div className="rounded-lg border border-amber-500/30 bg-ink-900/60 p-4">
      <header className="flex items-start gap-3 border-b-2 border-amber-500/40 pb-2">
        {portraitUrl && (
          <img src={portraitUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
        )}
        <div className="min-w-0 flex-1">
          {name && <h3 className="display text-lg font-semibold text-amber-300">{name}</h3>}
          {meta && <p className="text-xs italic text-ink-400">{meta}</p>}
        </div>
        {fire && (
          <div className="flex shrink-0 gap-1">
            <button
              className="btn-ghost h-7 px-2 text-xs"
              title="Roll initiative"
              onClick={(e) => fire(initiativeNotation(stats), `${who} initiative`, e)}
            >
              ⚡ Init
            </button>
            <button
              className="btn-ghost h-7 px-2 text-xs"
              title="Roll hit points"
              onClick={() =>
                onRoll!({
                  notation: `1d${hitDie}${
                    abilityMod(stats.abilities.con) ? formatMod(abilityMod(stats.abilities.con)!) : ""
                  }`,
                  label: `${who} HP`,
                })
              }
            >
              ❤ HP
            </button>
          </div>
        )}
      </header>

      {/* Advantage toggle — applies to every d20 roll below. */}
      {fire && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-ink-500">Roll mode</span>
          <div className="flex items-center rounded-lg border border-ink-700 bg-ink-900/60 p-0.5">
            {(
              [
                ["normal", "Normal"],
                ["adv", "Advantage"],
                ["dis", "Disadvantage"],
              ] as const
            ).map(([m, lbl]) => (
              <button
                key={m}
                className={clsx(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                  advMode === m
                    ? m === "adv"
                      ? "bg-emerald-600 text-white"
                      : m === "dis"
                        ? "bg-rose-600 text-white"
                        : "bg-accent-600 text-white"
                    : "text-ink-300 hover:bg-ink-800",
                )}
                onClick={() => setAdvMode(m)}
                title={`${lbl}${m !== "normal" ? " — or hold Shift (adv) / Alt (dis) when clicking" : ""}`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {topLine && <p className="mt-2 text-sm font-medium text-ink-200">{topLine}</p>}

      {/* Ability grid */}
      <div className="mt-3 grid grid-cols-6 gap-1 rounded-md border border-ink-700 bg-ink-950/40 p-2 text-center">
        {ABILITY_KEYS.map((k) => {
          const score = stats.abilities[k];
          const mod = abilityMod(score);
          const cell = (
            <>
              <div className="text-[10px] font-semibold uppercase text-accent-400">{ABILITY_LABEL[k]}</div>
              <div className="text-sm font-medium text-ink-100">{score ?? "—"}</div>
              <div className="text-[11px] text-ink-400">{formatMod(mod)}</div>
            </>
          );
          if (!fire || score == null) return <div key={k}>{cell}</div>;
          return (
            <button
              key={k}
              className="rounded-md transition-colors hover:bg-accent-700/30"
              title={`Roll ${ABILITY_NAMES[k]} check (Shift = advantage, Alt = disadvantage)`}
              onClick={(e) => fire(abilityCheckNotation(score, stats.profBonus), `${who} ${ABILITY_NAMES[k]} check`, e)}
            >
              {cell}
            </button>
          );
        })}
      </div>

      {/* Text lines */}
      <div className="mt-3 space-y-1">
        <ModChips label="Saving Throws" text={stats.saves} fire={fire} who={who} />
        <ModChips label="Skills" text={stats.skills} fire={fire} who={who} />
        <Line label="Senses" value={stats.senses} />
        <Line label="Languages" value={stats.languages} />
        <Line label="Damage Resistances" value={stats.damageResistances} />
        <Line label="Damage Immunities" value={stats.damageImmunities} />
        <Line label="Condition Immunities" value={stats.conditionImmunities} />
        {stats.profBonus != null && <Line label="Proficiency Bonus" value={formatMod(stats.profBonus)} />}
      </div>

      <EntryList title="Traits" entries={stats.traits} fire={fire} onRoll={onRoll} who={who} />
      <EntryList title="Actions" entries={stats.actions} fire={fire} onRoll={onRoll} who={who} />
      <EntryList title="Reactions" entries={stats.reactions} fire={fire} onRoll={onRoll} who={who} />
      <EntryList title="Legendary Actions" entries={stats.legendary} fire={fire} onRoll={onRoll} who={who} />
    </div>
  );
}
