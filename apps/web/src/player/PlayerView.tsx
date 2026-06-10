import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import clsx from "clsx";
import { useBroadcast, type ConnectionStatus } from "../hooks/useBroadcast.js";
import { useLogout, useMe } from "../auth/useAuth.js";
import { ThemeControl } from "../theme/ThemePanel.js";
import { BuyMeCoffee } from "../components/BuyMeCoffee.js";
import { Skeleton } from "../components/Skeleton.js";
import { ErrorBoundary } from "../components/ErrorBoundary.js";
import { useToast } from "../components/Toast.js";
import { usePlayerState } from "./usePlayer.js";
import { PlayerDock } from "./PlayerDock.js";
import { MapStage } from "./MapStage.js";
import { getShareRenderer } from "./shareRenderers.js";
import { useSectionChanges } from "./useSectionChanges.js";
import {
  CalendarWeatherBar,
  ClocksSection,
  CombatSection,
  DiceFeedSection,
  PartySection,
  RolltableBanner,
  TimersSection,
  TurnBanner,
  myTurnStatus,
} from "./sections.js";

export function PlayerView() {
  const { campaignId = "" } = useParams<{ campaignId: string }>();
  const logout = useLogout();
  const me = useMe();
  const toast = useToast();
  const myId = me.data?.user?.id;
  const [status, setStatus] = useState<ConnectionStatus>("reconnecting");

  const state = usePlayerState(campaignId);

  useBroadcast({
    url: `/api/campaigns/${campaignId}/player-stream`,
    campaignId,
    onStatus: setStatus,
  });

  // Announce recovery, but only after we were live once (initial connect is
  // also a reconnecting → live transition and must stay silent).
  const everLive = useRef(false);
  const prevStatus = useRef<ConnectionStatus>(status);
  useEffect(() => {
    if (status === "live") {
      if (prevStatus.current === "reconnecting" && everLive.current) {
        toast("Back online — live updates restored.", "success");
      }
      everLive.current = true;
    }
    prevStatus.current = status;
  }, [status, toast]);

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
        <span className="sr-only">{status === "live" ? "Live" : "Reconnecting"}</span>
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
        <main className="min-w-0 space-y-4">
          {state.isLoading || !state.data ? (
            <>
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-[40vh]" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <ErrorBoundary>
              <StageContent s={state.data} myId={myId} live={status === "live"} />
            </ErrorBoundary>
          )}
        </main>

        {/* Dock (desktop sidebar + mobile bottom sheets) */}
        <PlayerDock campaignId={campaignId} />
      </div>
    </div>
  );
}

interface SectionDef {
  id: string;
  label: string;
  icon: string;
  present: boolean;
}

function StageContent({
  s,
  myId,
  live,
}: {
  s: NonNullable<ReturnType<typeof usePlayerState>["data"]>;
  myId: string | undefined;
  live: boolean;
}) {
  const { calendar, weather, rolltable, map, combat, party, clocks, timers, dice } = s.data;
  const widgets = s.widgets ?? [];
  const anyActive = s.broadcasts.some((b) => b.active);

  const changed = useSectionChanges({
    scene: { calendar, weather },
    rolltable,
    map,
    combat,
    party,
    clocks,
    timers,
    dice,
    more: widgets,
  });

  if (!anyActive) {
    return <WaitingForGm campaignName={s.campaign.name} live={live} />;
  }

  const turn = myTurnStatus(combat, party, myId);

  const sections: SectionDef[] = [
    { id: "scene", label: "Scene", icon: "🕯️", present: Boolean(calendar || weather) },
    { id: "rolltable", label: "Roll", icon: "🎲", present: Boolean(rolltable) },
    { id: "map", label: "Map", icon: "🗺️", present: Boolean(map) },
    { id: "combat", label: "Combat", icon: "⚔️", present: Boolean(combat) },
    { id: "party", label: "Party", icon: "🛡️", present: Boolean(party) },
    { id: "clocks", label: "Clocks", icon: "🕗", present: Boolean(clocks && clocks.length > 0) },
    { id: "timers", label: "Timers", icon: "⏱️", present: Boolean(timers && timers.length > 0) },
    { id: "dice", label: "Dice", icon: "🎲", present: Boolean(dice && dice.length > 0) },
    { id: "more", label: "More", icon: "✨", present: widgets.length > 0 },
  ];
  const present = sections.filter((x) => x.present);

  const wrap = (id: string, node: ReactNode) => (
    <div
      id={`sec-${id}`}
      className={clsx(
        "scroll-mt-32 rounded-xl transition-shadow duration-300",
        changed.has(id) && "ring-1 ring-accent-500/70",
      )}
    >
      {node}
    </div>
  );

  return (
    <>
      {/* Section navigation — only worth the space with 3+ sections */}
      {present.length >= 3 && (
        <nav
          aria-label="Stage sections"
          className="sticky top-[60px] z-10 -mx-1 flex gap-1.5 overflow-x-auto rounded-xl bg-ink-950/80 px-1 py-1.5 backdrop-blur"
        >
          {present.map((sec) => (
            <button
              key={sec.id}
              className="chip relative shrink-0 cursor-pointer transition-colors hover:border-accent-500 hover:text-ink-50"
              onClick={() =>
                document
                  .getElementById(`sec-${sec.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              <span aria-hidden="true" className="mr-1">{sec.icon}</span>
              {sec.label}
              {changed.has(sec.id) && (
                <span
                  aria-label="Updated"
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent-500"
                />
              )}
            </button>
          ))}
        </nav>
      )}

      {turn && <TurnBanner turn={turn} />}

      {(calendar || weather) &&
        wrap("scene", <CalendarWeatherBar calendar={calendar} weather={weather} />)}

      {rolltable && wrap("rolltable", <RolltableBanner rolltable={rolltable} />)}

      {map && wrap("map", <MapStage map={map} />)}

      {combat && wrap("combat", <CombatSection combat={combat} />)}

      {party && wrap("party", <PartySection party={party} myId={myId} />)}

      {clocks && clocks.length > 0 && wrap("clocks", <ClocksSection clocks={clocks} />)}

      {timers && timers.length > 0 && wrap("timers", <TimersSection timers={timers} />)}

      {dice && dice.length > 0 && wrap("dice", <DiceFeedSection dice={dice} />)}

      {/* Generic share-engine widgets (npc, bestiary, shop, sessions, log, sticky, …) */}
      {widgets.length > 0 &&
        wrap(
          "more",
          <div className="space-y-4">
            {widgets.map((w) => {
              const Renderer = getShareRenderer(w.type);
              return (
                <ErrorBoundary key={w.widgetKey}>
                  <Renderer data={w.data} widgetKey={w.widgetKey} />
                </ErrorBoundary>
              );
            })}
          </div>,
        )}
    </>
  );
}

/** Friendly idle state shown until the GM shares something. */
function WaitingForGm({ campaignName, live }: { campaignName: string; live: boolean }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 border-dashed px-6 py-16 text-center">
      <span className="animate-bounce text-5xl" aria-hidden="true">
        🎲
      </span>
      <h2 className="display text-2xl font-semibold">{campaignName}</h2>
      <p className="max-w-md text-sm text-ink-400">
        Whatever the GM shares — maps, initiative, the scene — will appear here the moment it goes
        live.
      </p>
      <p className="text-xs text-ink-500">
        {live ? (
          <>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle" />
            Connected — waiting for the Game Master.
          </>
        ) : (
          "Connecting…"
        )}
      </p>
      <p className="text-xs text-ink-500">
        Meanwhile: roll some dice or check your character
        <span className="hidden lg:inline"> in the sidebar →</span>
        <span className="lg:hidden"> with the bar below.</span>
      </p>
    </div>
  );
}
