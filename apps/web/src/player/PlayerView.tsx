import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Broadcast, Calendar, Encounter, PartyMember, PartyMemberStatus, Weather } from "@toolkit/shared";
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
        <h1 className="text-2xl font-semibold">{s.campaign.name}</h1>
        <span className="text-xs text-ink-500">Player view</span>
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
