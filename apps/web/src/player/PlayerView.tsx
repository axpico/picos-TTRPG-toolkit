import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type {
  Broadcast,
  Calendar,
  Encounter,
  PartyMember,
  PartyMemberStatus,
  PublicLocation,
  RollTableResult,
  Weather,
} from "@toolkit/shared";
import { api } from "../api/client.js";
import { useBroadcast } from "../hooks/useBroadcast.js";
import clsx from "clsx";

interface PlayerState {
  campaign: { id: string; name: string };
  broadcasts: Broadcast[];
  data: {
    party: PartyMember[] | null;
    combat: Encounter | null;
    weather: Weather | null;
    calendar: Calendar | null;
    map: PublicLocation | null;
    rolltable: RollTableResult | null;
  };
}

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
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";

  const state = useQuery({
    queryKey: ["player", campaignId, token],
    enabled: Boolean(campaignId && token),
    queryFn: () =>
      api.get<PlayerState>(`/api/player/${campaignId}?t=${encodeURIComponent(token)}`),
  });

  useBroadcast({
    url: `/api/player/${campaignId}/stream?t=${encodeURIComponent(token)}`,
    campaignId,
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-300">
        Missing share token.
      </div>
    );
  }
  if (state.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-red-400">
        Invalid or expired share token.
      </div>
    );
  }
  if (state.isLoading || !state.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-400">
        Connecting…
      </div>
    );
  }

  const s = state.data;
  const anyActive = s.broadcasts.some((b) => b.active);

  return (
    <div className="min-h-screen bg-ink-950 px-8 py-8 text-ink-50">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="display text-3xl font-semibold tracking-tight">{s.campaign.name}</h1>
        <span className="text-xs uppercase tracking-widest text-ink-500">Player view</span>
      </header>

      {!anyActive && (
        <p className="rounded-md border border-ink-800 bg-ink-900 px-4 py-6 text-center text-ink-400">
          Waiting for the Game Master to share something…
        </p>
      )}

      {s.data.calendar && (
        <section className="card mb-4 p-4">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-ink-300">
            Date & Time
          </h2>
          <div className="text-lg font-semibold">
            {s.data.calendar.currentDay}{" "}
            {s.data.calendar.definition.monthNames[s.data.calendar.currentMonth - 1] ??
              `Month ${s.data.calendar.currentMonth}`}{" "}
            {s.data.calendar.currentYear}
          </div>
          <div className="font-mono text-sm text-ink-300">
            {String(s.data.calendar.currentHour).padStart(2, "0")}:
            {String(s.data.calendar.currentMinute).padStart(2, "0")}
          </div>
        </section>
      )}

      {s.data.rolltable && (
        <section className="card mb-4 border-accent-500/40 bg-accent-500/5 p-4">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-ink-300">
            {s.data.rolltable.tableName}
          </h2>
          <div className="text-lg font-semibold text-accent-400">{s.data.rolltable.text}</div>
        </section>
      )}

      {s.data.map && <MapSection map={s.data.map} />}

      {s.data.weather && (
        <section className="card mb-4 p-4">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-ink-300">
            Weather
          </h2>
          <div className="text-lg font-semibold">{s.data.weather.current.condition}</div>
          <div className="text-sm text-ink-300">{s.data.weather.current.temperature}</div>
          <p className="mt-1 text-sm text-ink-200">{s.data.weather.current.description}</p>
        </section>
      )}

      {s.data.combat && (
        <section className="card mb-4 p-4">
          <header className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ink-300">
              Initiative — {s.data.combat.name}
            </h2>
            <span className="text-xs text-ink-500">Round {s.data.combat.round}</span>
          </header>
          <ol className="space-y-1">
            {s.data.combat.combatants.map((c, idx) => (
              <li
                key={c.id}
                className={clsx(
                  "flex items-center justify-between rounded-md border px-3 py-1.5",
                  idx === s.data.combat!.currentTurn
                    ? "border-accent-500 bg-accent-500/10"
                    : "border-ink-700 bg-ink-900",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink-400">{c.initiative}</span>
                  <span>{c.name}</span>
                  {c.isPC && <span className="chip">PC</span>}
                </span>
                {c.conditions.length > 0 && (
                  <span className="text-xs text-ink-400">{c.conditions.join(", ")}</span>
                )}
              </li>
            ))}
            {s.data.combat.combatants.length === 0 && (
              <li className="text-sm text-ink-400">No combatants.</li>
            )}
          </ol>
        </section>
      )}

      {s.data.party && (
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-300">
            Party
          </h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {s.data.party.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md border border-ink-700 bg-ink-900 px-3 py-2"
              >
                <div>
                  <div className="font-medium">{m.name}</div>
                  {m.playerName && (
                    <div className="text-xs text-ink-400">{m.playerName}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{m.hp}/{m.hpMax}</span>
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-xs",
                      STATUS_STYLE[m.status],
                    )}
                  >
                    {STATUS_LABEL[m.status]}
                  </span>
                </div>
              </li>
            ))}
            {s.data.party.length === 0 && (
              <li className="text-ink-400">No party members listed.</li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Renders the broadcasted map. Pins are pre-filtered server-side (hidden pins
 * are stripped before sending to the player). Reveals are rectangular cutouts
 * in a black overlay — when there are no reveals, the full map shows.
 */
function MapSection({ map }: { map: PublicLocation }) {
  const hasReveals = map.reveals.some((r) => r.mode === "reveal");
  return (
    <section className="card mb-4 overflow-hidden">
      <header className="border-b border-ink-700 px-4 py-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-300">
          {map.name}
        </h2>
        {map.playerNotes && (
          <p className="mt-1 text-sm text-ink-200">{map.playerNotes}</p>
        )}
      </header>
      {map.imageUrl ? (
        <div className="relative inline-block max-w-full">
          <img
            src={map.imageUrl}
            alt={map.name}
            draggable={false}
            className="block max-w-full"
          />
          {/* Fog-of-war: black overlay with reveal/hide cutouts. */}
          {hasReveals && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="fog-mask" maskContentUnits="objectBoundingBox">
                  {/* Start opaque (everything obscured). */}
                  <rect x="0" y="0" width="1" height="1" fill="white" />
                  {/* Reveal rectangles cut holes (black = transparent in mask). */}
                  {map.reveals
                    .filter((r) => r.mode === "reveal")
                    .map((r) => (
                      <rect
                        key={r.id}
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill="black"
                      />
                    ))}
                  {/* Hide rectangles cover previously revealed areas. */}
                  {map.reveals
                    .filter((r) => r.mode === "hide")
                    .map((r) => (
                      <rect
                        key={r.id}
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        fill="white"
                      />
                    ))}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="1"
                height="1"
                fill="rgba(0,0,0,0.92)"
                mask="url(#fog-mask)"
              />
            </svg>
          )}
          {/* Pins on top of fog. */}
          {map.pins.map((p) => (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            >
              <div
                className="h-4 w-4 rounded-full border-2 border-black/70 shadow"
                style={{ backgroundColor: p.color }}
              />
              {p.label && (
                <span className="absolute left-4 top-0 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                  {p.label}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-ink-400">No map image.</div>
      )}
    </section>
  );
}
