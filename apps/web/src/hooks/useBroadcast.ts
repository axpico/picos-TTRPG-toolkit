import { useEffect, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { SSEEvent } from "@toolkit/shared";

type Handler = (event: SSEEvent) => void;
export type ConnectionStatus = "live" | "reconnecting";

interface Options {
  url: string;
  campaignId: string;
  onEvent?: Handler;
  /** Connection lifecycle: "live" on open, "reconnecting" while retrying. */
  onStatus?: (status: ConnectionStatus) => void;
}

/**
 * Maps an event-type family (the prefix before the first dot) to the React Query
 * keys it should invalidate. The player view (`["player", campaignId]`) is always
 * invalidated in addition, so any shared widget refreshes on the player side.
 * A new live module only needs a row here plus its named events in EVENT_TYPES.
 */
const FAMILY_KEYS: Record<string, (campaignId: string) => QueryKey[]> = {
  party: (c) => [["party", c]],
  combat: (c) => [["combat", c]],
  weather: (c) => [["weather", c]],
  calendar: (c) => [["calendar", c]],
  log: (c) => [["log", c]],
  location: (c) => [["locations", c]],
  rolltable: () => [],
  dice: (c) => [["dice", c]],
  clock: (c) => [["clocks", c]],
  timer: (c) => [["timers", c]],
  npc: () => [["npcs"]],
  bestiary: () => [["monsters"]],
  shop: (c) => [["shops", c]],
  sessions: (c) => [["sessions", c]],
};

/**
 * Named SSE events the server emits (`event: <type>`). EventSource requires an
 * exact listener per name, so they are enumerated here; the dispatch logic keys
 * off the family prefix via FAMILY_KEYS, so adding a module is a one-line change
 * in each table.
 */
const EVENT_TYPES = [
  "party.create",
  "party.update",
  "party.delete",
  "combat.create",
  "combat.update",
  "combat.delete",
  "weather.update",
  "calendar.update",
  "log.append",
  "broadcast.change",
  "campaign.update",
  "location.update",
  "rolltable.roll",
  "dice.roll",
  "clock.create",
  "clock.update",
  "clock.delete",
  "timer.create",
  "timer.update",
  "timer.delete",
  "npc.update",
  "bestiary.update",
  "shop.update",
  "sessions.update",
  "presence.change",
  "membership.change",
];

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

/**
 * Subscribes to an SSE stream and dispatches TanStack Query invalidations driven
 * by FAMILY_KEYS. Reconnection uses explicit exponential backoff with jitter
 * (rather than relying on the browser's opaque auto-retry) so the "reconnecting"
 * state is deterministic and visible.
 */
export function useBroadcast({ url, campaignId, onEvent, onStatus }: Options) {
  const qc = useQueryClient();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    let source: EventSource | null = null;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const dispatch = (event: SSEEvent) => {
      const family = event.type.split(".")[0]!;
      const keys = FAMILY_KEYS[family]?.(campaignId);
      if (keys) {
        for (const key of keys) qc.invalidateQueries({ queryKey: key });
        // Anything with a projector affects the player view.
        qc.invalidateQueries({ queryKey: ["player", campaignId] });
      }
      if (event.type === "broadcast.change") {
        qc.invalidateQueries({ queryKey: ["broadcasts", campaignId] });
        qc.invalidateQueries({ queryKey: ["player", campaignId] });
      }
      if (event.type === "campaign.update") {
        qc.invalidateQueries({ queryKey: ["campaigns"] });
        qc.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      }
      if (event.type === "presence.change") {
        qc.invalidateQueries({ queryKey: ["presence", campaignId] });
      }
      if (event.type === "membership.change") {
        // A member was added/removed/role-changed: refresh campaign + member lists.
        qc.invalidateQueries({ queryKey: ["campaigns"] });
        qc.invalidateQueries({ queryKey: ["campaign-members", campaignId] });
        qc.invalidateQueries({ queryKey: ["auth"] }); // memberships live on /me
      }
      handlerRef.current?.(event);
    };

    const parse = (data: string) => {
      if (!data) return; // heartbeats / blank lines
      try {
        dispatch(JSON.parse(data) as SSEEvent);
      } catch {
        /* swallow malformed frames */
      }
    };
    const onCustom = (ev: MessageEvent) => parse(ev.data);

    const scheduleReconnect = () => {
      if (closed || retryTimer) return;
      statusRef.current?.("reconnecting");
      // Exponential backoff with full jitter, capped.
      const ceiling = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** retries);
      const delay = Math.random() * ceiling;
      retries += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (closed) return;
      source = new EventSource(url, { withCredentials: true });
      source.onopen = () => {
        retries = 0;
        statusRef.current?.("live");
      };
      source.onmessage = (e) => parse(e.data);
      for (const t of EVENT_TYPES) source.addEventListener(t, onCustom as EventListener);
      source.onerror = () => {
        // Take over retries ourselves for deterministic, visible backoff.
        source?.close();
        source = null;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (source) {
        for (const t of EVENT_TYPES) source.removeEventListener(t, onCustom as EventListener);
        source.close();
      }
    };
  }, [url, campaignId, qc]);
}
