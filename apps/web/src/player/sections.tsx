import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  weatherIcon,
  type Calendar,
  type DiceRoll,
  type Encounter,
  type PartyMember,
  type PartyMemberStatus,
  type ProgressClock,
  type RollTableResult,
  type Timer,
  type Weather,
} from "@toolkit/shared";
import { HpBar } from "../modules/shared.js";
import { formatClock, formatDayPhase, formatGameDate } from "./format.js";
import { formatDuration, remainingSeconds } from "../modules/timers/util.js";

const STATUS_LABEL: Record<PartyMemberStatus, string> = {
  active: "Active",
  down: "Down",
  stable: "Stable",
  dead: "Dead",
};

const STATUS_STYLE: Record<PartyMemberStatus, string> = {
  active: "bg-emerald-700/40 text-emerald-100",
  down: "bg-amber-700/40 text-amber-100",
  stable: "bg-sky-700/40 text-sky-100",
  dead: "bg-red-800/40 text-red-100",
};

/**
 * Where the viewing player sits in the turn order: "current" when it's their
 * combatant's turn, "next" when they're on deck. Combatants pulled from the
 * party share its name, so the match is name-based (PCs only).
 */
export function myTurnStatus(
  combat: Encounter | null,
  party: PartyMember[] | null,
  myId: string | undefined,
): { status: "current" | "next"; name: string } | null {
  if (!combat || !combat.active || !myId) return null;
  const count = combat.combatants.length;
  if (count === 0) return null;
  const mine = (party ?? []).find((m) => m.userId === myId);
  if (!mine) return null;
  const myName = mine.name.trim().toLowerCase();
  const isMine = (idx: number) => {
    const c = combat.combatants[idx % count];
    return Boolean(c && c.isPC && !c.defeated && c.name.trim().toLowerCase() === myName);
  };
  if (isMine(combat.currentTurn)) return { status: "current", name: mine.name };
  if (count > 1 && isMine(combat.currentTurn + 1)) return { status: "next", name: mine.name };
  return null;
}

/** Prominent banner when it's the viewing player's turn (or they're on deck). */
export function TurnBanner({ turn }: { turn: { status: "current" | "next"; name: string } }) {
  const current = turn.status === "current";
  return (
    <div
      role="status"
      className={clsx(
        "card flex items-center gap-3 p-4 animate-[revealIn_0.3s_ease-out]",
        current
          ? "border-accent-500 bg-accent-500/15"
          : "border-ink-600 bg-ink-900/80",
      )}
    >
      <span className="text-2xl" aria-hidden="true">
        ⚔️
      </span>
      <div>
        <div className={clsx("display text-lg font-semibold", current && "text-accent-300")}>
          {current ? `You're up, ${turn.name}!` : "You're on deck"}
        </div>
        <div className="text-sm text-ink-400">
          {current ? "The GM is waiting on your action." : "Your turn is next — start planning."}
        </div>
      </div>
    </div>
  );
}

export function CalendarWeatherBar({
  calendar,
  weather,
}: {
  calendar: Calendar | null;
  weather: Weather | null;
}) {
  return (
    <section className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-3 text-sm">
      {calendar && (
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase tracking-wide text-ink-500">Date</span>
          <span className="font-medium">{formatGameDate(calendar)}</span>
          <span className="font-mono text-ink-300">{formatClock(calendar)}</span>
          <span className="text-xs text-ink-400">{formatDayPhase(calendar)}</span>
        </div>
      )}
      {weather && (
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase tracking-wide text-ink-500">Weather</span>
          <span>{weatherIcon(weather.current.condition)}</span>
          <span className="font-medium">{weather.current.condition}</span>
          <span className="text-ink-300">{weather.current.temperature}</span>
          {weather.current.description && (
            <span className="text-ink-400">— {weather.current.description}</span>
          )}
        </div>
      )}
    </section>
  );
}

export function RolltableBanner({ rolltable }: { rolltable: RollTableResult }) {
  return (
    <section className="card border-accent-500/40 bg-accent-500/5 p-5 text-center animate-[revealIn_0.3s_ease-out]">
      <h2 className="mb-1 text-xs font-medium uppercase tracking-widest text-ink-400">
        {rolltable.tableName}
      </h2>
      <div className="display text-2xl font-semibold text-accent-400">{rolltable.text}</div>
    </section>
  );
}

/** Cap very long initiative lists and keep the active combatant in view. */
const COMBAT_OVERFLOW_AT = 10;

export function CombatSection({ combat }: { combat: Encounter }) {
  const currentRef = useRef<HTMLLIElement>(null);
  const overflow = combat.combatants.length > COMBAT_OVERFLOW_AT;

  useEffect(() => {
    if (overflow) currentRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [combat.currentTurn, overflow]);

  return (
    <section className="card p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-300">
          Initiative — {combat.name}
        </h2>
        <span className="chip">Round {combat.round}</span>
      </header>
      <ol className={clsx("space-y-1", overflow && "max-h-[40vh] overflow-y-auto pr-1")}>
        {combat.combatants.map((c, idx) => {
          const isCurrent = idx === combat.currentTurn;
          return (
            <li
              key={c.id}
              ref={isCurrent ? currentRef : undefined}
              className={clsx(
                "flex items-center justify-between rounded-md border px-3 py-2 transition-colors",
                isCurrent ? "border-accent-500 bg-accent-500/15" : "border-ink-700 bg-ink-900",
                c.defeated && "opacity-50",
              )}
            >
              <span className="flex items-center gap-2">
                {isCurrent && <span className="text-accent-400">▸</span>}
                <span className="font-mono text-xs text-ink-400">{c.initiative}</span>
                <span className={clsx("font-medium", c.defeated && "line-through")}>{c.name}</span>
                {c.isPC && <span className="chip">PC</span>}
              </span>
              {c.conditions.length > 0 && (
                <span className="text-xs text-ink-400">{c.conditions.join(", ")}</span>
              )}
            </li>
          );
        })}
        {combat.combatants.length === 0 && <li className="text-sm text-ink-400">No combatants.</li>}
      </ol>
    </section>
  );
}

export function PartySection({
  party,
  myId,
}: {
  party: PartyMember[];
  myId: string | undefined;
}) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-300">Party</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {party.map((m) => {
          const mine = Boolean(myId && m.userId === myId);
          return (
            <li
              key={m.id}
              className={clsx(
                "rounded-md border px-3 py-2",
                mine ? "border-accent-500/60 bg-accent-500/5" : "border-ink-700 bg-ink-900",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  {m.name}
                  {mine && <span className="chip">You</span>}
                </span>
                <span className={clsx("rounded-full px-2 py-0.5 text-xs", STATUS_STYLE[m.status])}>
                  {STATUS_LABEL[m.status]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <HpBar hp={m.hp} hpMax={m.hpMax} />
                </div>
                <span className="shrink-0 font-mono text-xs text-ink-300">
                  {m.hp}/{m.hpMax}
                </span>
              </div>
            </li>
          );
        })}
        {party.length === 0 && <li className="text-ink-400">No party members listed.</li>}
      </ul>
    </section>
  );
}

export function ClocksSection({ clocks }: { clocks: ProgressClock[] }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-300">Clocks</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {clocks.map((clock) => {
          const full = clock.filled >= clock.segments;
          return (
            <li
              key={clock.id}
              className={clsx(
                "rounded-md border px-3 py-2",
                full ? "border-red-500/50 bg-red-900/10" : "border-ink-700 bg-ink-900",
              )}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="font-medium">{clock.name}</span>
                <span className={clsx("font-mono text-xs", full ? "text-red-400" : "text-ink-400")}>
                  {clock.filled}/{clock.segments}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: clock.segments }, (_, i) => (
                  <span
                    key={i}
                    className="h-3 w-3 rounded-full border border-ink-700"
                    style={{ backgroundColor: i < clock.filled ? clock.color : "transparent" }}
                  />
                ))}
              </div>
              {clock.description && (
                <div className="mt-1 text-xs text-ink-400">{clock.description}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TimersSection({ timers }: { timers: Timer[] }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-300">Timers</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {timers.map((timer) => {
          const remaining = remainingSeconds(timer, nowMs);
          const running = timer.endsAt != null;
          const done = running && remaining === 0;
          const urgent = running && !done && remaining <= 10;
          return (
            <li
              key={timer.id}
              className={clsx(
                "flex items-center justify-between gap-3 rounded-md border px-3 py-2",
                done || urgent
                  ? "animate-pulse border-red-500/60 bg-red-900/15"
                  : "border-ink-700 bg-ink-900",
              )}
            >
              <span className="min-w-0 truncate font-medium">{timer.name}</span>
              <span
                className={clsx(
                  "shrink-0 font-mono text-xl font-bold tabular-nums",
                  done || urgent ? "text-red-300" : "text-ink-100",
                )}
                style={!done && !urgent ? { color: timer.color } : undefined}
              >
                {formatDuration(remaining)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DiceFeedSection({ dice }: { dice: DiceRoll[] }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-300">Recent rolls</h2>
      <ul className="space-y-1 text-sm">
        {dice.map((r) => (
          <li
            key={r.id}
            className="flex items-baseline gap-2 rounded-md border border-ink-700 bg-ink-900 px-3 py-1.5"
          >
            <span className="font-mono text-xs text-ink-400">{r.notation}</span>
            <span className="text-ink-500">→</span>
            <span className="font-bold text-accent-400">{r.result}</span>
            {r.label && <span className="text-xs italic text-ink-500">{r.label}</span>}
            {r.rollerName && <span className="ml-auto text-xs text-ink-500">{r.rollerName}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
