import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SSEEvent } from "@toolkit/shared";

type Handler = (event: SSEEvent) => void;
export type ConnectionStatus = "live" | "reconnecting";

interface Options {
  url: string;
  campaignId: string;
  onEvent?: Handler;
  /** Connection lifecycle: "live" on open, "reconnecting" on error. */
  onStatus?: (status: ConnectionStatus) => void;
}

/**
 * Subscribes to an SSE stream. On each event, dispatches a TanStack Query
 * invalidation matching common resource families (party, log, broadcasts).
 * Per-module handlers can be supplied via `onEvent` for custom behavior.
 */
export function useBroadcast({ url, campaignId, onEvent, onStatus }: Options) {
  const qc = useQueryClient();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    const source = new EventSource(url, { withCredentials: true });
    source.onopen = () => statusRef.current?.("live");

    const dispatch = (event: SSEEvent) => {
      if (event.type.startsWith("party.")) {
        qc.invalidateQueries({ queryKey: ["party", campaignId] });
        qc.invalidateQueries({ queryKey: ["player", campaignId] });
      }
      if (event.type.startsWith("combat.")) {
        qc.invalidateQueries({ queryKey: ["combat", campaignId] });
        qc.invalidateQueries({ queryKey: ["player", campaignId] });
      }
      if (event.type.startsWith("weather.")) {
        qc.invalidateQueries({ queryKey: ["weather", campaignId] });
        qc.invalidateQueries({ queryKey: ["player", campaignId] });
      }
      if (event.type.startsWith("calendar.")) {
        qc.invalidateQueries({ queryKey: ["calendar", campaignId] });
        qc.invalidateQueries({ queryKey: ["player", campaignId] });
      }
      if (event.type.startsWith("log.")) {
        qc.invalidateQueries({ queryKey: ["log", campaignId] });
      }
      if (event.type.startsWith("location.")) {
        qc.invalidateQueries({ queryKey: ["locations", campaignId] });
        qc.invalidateQueries({ queryKey: ["player", campaignId] });
      }
      if (event.type.startsWith("rolltable.")) {
        qc.invalidateQueries({ queryKey: ["player", campaignId] });
      }
      if (event.type.startsWith("dice.")) {
        qc.invalidateQueries({ queryKey: ["dice", campaignId] });
        qc.invalidateQueries({ queryKey: ["player", campaignId] });
      }
      if (event.type.startsWith("clock.")) {
        qc.invalidateQueries({ queryKey: ["clocks", campaignId] });
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
      handlerRef.current?.(event);
    };

    source.onmessage = (e) => {
      // Untyped messages (e.g. heartbeats) – ignore.
      if (!e.data) return;
      try {
        dispatch(JSON.parse(e.data) as SSEEvent);
      } catch {
        /* swallow */
      }
    };

    // Named events: server uses `event: <type>` so listen wildcard via a custom listener.
    const onCustom = (ev: MessageEvent) => {
      try {
        dispatch(JSON.parse(ev.data) as SSEEvent);
      } catch {
        /* swallow */
      }
    };
    const eventTypes = [
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
    ];
    for (const t of eventTypes) source.addEventListener(t, onCustom as EventListener);

    source.onerror = () => {
      // The browser will auto-reconnect. Surface in console for visibility.
      console.warn("[sse] connection error, browser will reconnect");
      statusRef.current?.("reconnecting");
    };

    return () => {
      for (const t of eventTypes) source.removeEventListener(t, onCustom as EventListener);
      source.close();
    };
  }, [url, campaignId, qc]);
}
