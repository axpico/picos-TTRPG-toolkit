import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { weatherIcon, type PartyMemberStatus } from "@toolkit/shared";
import clsx from "clsx";
import { useBroadcast, type ConnectionStatus } from "../hooks/useBroadcast.js";
import { useLogout, useMe } from "../auth/useAuth.js";
import { ThemeControl } from "../theme/ThemePanel.js";
import { HpBar } from "../modules/shared.js";
import { EmptyState } from "../components/EmptyState.js";
import { BuyMeCoffee } from "../components/BuyMeCoffee.js";
import { Skeleton } from "../components/Skeleton.js";
import { usePlayerState } from "./usePlayer.js";
import { PlayerDock } from "./PlayerDock.js";
import { MapStage } from "./MapStage.js";
import { formatClock, formatDayPhase, formatGameDate } from "./format.js";

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

export function PlayerView() {
  const { campaignId = "" } = useParams<{ campaignId: string }>();
  const logout = useLogout();
  const me = useMe();
  const myId = me.data?.user?.id;
  const [status, setStatus] = useState<ConnectionStatus>("reconnecting");

  const state = usePlayerState(campaignId);

  useBroadcast({
    url: `/api/campaigns/${campaignId}/player-stream`,
    campaignId,
    onStatus: setStatus,
  });

  // Brief accent ring when the shared state changes.
  const [pulse, setPulse] = useState(false);
  const lastUpdate = useRef(0);
  useEffect(() => {
    if (state.dataUpdatedAt && state.dataUpdatedAt !== lastUpdate.current) {
      lastUpdate.current = state.dataUpdatedAt;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      return () => clearTimeout(t);
    }
  }, [state.dataUpdatedAt]);

  const header = (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-ink-800/80 bg-ink-950/70 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={clsx(
            "h-2 w-2 shrink-0 rounded-full",
            status === "live" ? "animate-pulse bg-emerald-400" : "bg-amber-400",
          )}
          title={status === "live" ? "Live" : "Reconnecting…"}
        />
        <h1 className="display truncate text-xl font-semibold tracking-tight sm:text-2xl">
          {state.data?.campaign.name ?? "…"}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/campaigns" className="btn-ghost hidden sm:inline-flex">Campaigns</Link>
        <BuyMeCoffee />
        <ThemeControl />
        <button className="btn-ghost" onClick={() => logout.mutate()}>Sign out</button>
      </div>
    </header>
  );

  if (state.isError) {
    return (
      <div className="min-h-screen">
        {header}
        <div className="flex min-h-[60vh] items-center justify-center px-4 text-center text-red-400">
          You don't have access to this campaign.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {header}
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px]">
        {/* Stage */}
        <main
          className={clsx(
            "min-w-0 space-y-4 rounded-xl",
            pulse && "animate-[stagePulse_0.7s_ease-out]",
          )}
        >
          {state.isLoading || !state.data ? (
            <>
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-[40vh]" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <StageContent s={state.data} myId={myId} />
          )}
        </main>

        {/* Dock (desktop sidebar + mobile bottom sheets) */}
        <PlayerDock campaignId={campaignId} />
      </div>
    </div>
  );
}

function StageContent({
  s,
  myId,
}: {
  s: NonNullable<ReturnType<typeof usePlayerState>["data"]>;
  myId: string | undefined;
}) {
  const { calendar, weather, rolltable, map, combat, party, clocks, dice } = s.data;
  const anyActive = s.broadcasts.some((b) => b.active);

  if (!anyActive) {
    return (
      <EmptyState
        icon="🎲"
        title="Waiting for the Game Master"
        description="Whatever the GM shares — maps, initiative, the scene — will appear here."
      />
    );
  }

  return (
    <>
      {(calendar || weather) && (
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
      )}

      {rolltable && (
        <section className="card border-accent-500/40 bg-accent-500/5 p-5 text-center animate-[revealIn_0.3s_ease-out]">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-widest text-ink-400">
            {rolltable.tableName}
          </h2>
          <div className="display text-2xl font-semibold text-accent-400">{rolltable.text}</div>
        </section>
      )}

      {map && <MapStage map={map} />}

      {combat && (
        <section className="card p-4">
          <header className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ink-300">
              Initiative — {combat.name}
            </h2>
            <span className="chip">Round {combat.round}</span>
          </header>
          <ol className="space-y-1">
            {combat.combatants.map((c, idx) => (
              <li
                key={c.id}
                className={clsx(
                  "flex items-center justify-between rounded-md border px-3 py-2 transition-colors",
                  idx === combat.currentTurn
                    ? "border-accent-500 bg-accent-500/15"
                    : "border-ink-700 bg-ink-900",
                )}
              >
                <span className="flex items-center gap-2">
                  {idx === combat.currentTurn && <span className="text-accent-400">▸</span>}
                  <span className="font-mono text-xs text-ink-400">{c.initiative}</span>
                  <span className="font-medium">{c.name}</span>
                  {c.isPC && <span className="chip">PC</span>}
                </span>
                {c.conditions.length > 0 && (
                  <span className="text-xs text-ink-400">{c.conditions.join(", ")}</span>
                )}
              </li>
            ))}
            {combat.combatants.length === 0 && <li className="text-sm text-ink-400">No combatants.</li>}
          </ol>
        </section>
      )}

      {party && (
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
                    <div className="flex-1"><HpBar hp={m.hp} hpMax={m.hpMax} /></div>
                    <span className="shrink-0 font-mono text-xs text-ink-300">{m.hp}/{m.hpMax}</span>
                  </div>
                </li>
              );
            })}
            {party.length === 0 && <li className="text-ink-400">No party members listed.</li>}
          </ul>
        </section>
      )}

      {clocks && clocks.length > 0 && (
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
      )}

      {dice && dice.length > 0 && (
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
      )}
    </>
  );
}
