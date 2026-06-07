import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Broadcast } from "@toolkit/shared";
import { api } from "../../api/client.js";

export function useBroadcasts(campaignId: string) {
  return useQuery({
    queryKey: ["broadcasts", campaignId],
    enabled: Boolean(campaignId),
    queryFn: () => api.get<Broadcast[]>(`/api/campaigns/${campaignId}/broadcasts`),
  });
}

export function useSetBroadcast(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { widgetKey: string; active: boolean; payload?: Record<string, unknown> }) =>
      api.put<Broadcast>(`/api/campaigns/${campaignId}/broadcasts/${encodeURIComponent(args.widgetKey)}`, {
        active: args.active,
        payload: args.payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["broadcasts", campaignId] }),
  });
}

/** Batch toggle for Share All / Hide All across many widgets in one request. */
export function useSetBroadcasts(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { active: boolean; widgetKeys: string[] }) =>
      api.put<Broadcast[]>(`/api/campaigns/${campaignId}/broadcasts`, {
        active: args.active,
        widgetKeys: args.widgetKeys,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcasts", campaignId] });
      qc.invalidateQueries({ queryKey: ["player", campaignId] });
    },
  });
}

/**
 * One-stop hook for a single widget's broadcast slot. Reads whether the slot is
 * currently live, exposes its payload, and offers `share`/`stop` helpers — so
 * widgets stop re-implementing the "find my broadcast → read payload →
 * setBroadcast" dance. `share()` always activates the slot; pass the
 * widget-specific payload (e.g. `{ monsterId }`, or the full sticky state).
 */
export function useWidgetBroadcast(campaignId: string, broadcastKey: string | undefined) {
  const broadcasts = useBroadcasts(campaignId);
  const setBroadcast = useSetBroadcast(campaignId);

  const current = broadcastKey
    ? broadcasts.data?.find((b) => b.widgetKey === broadcastKey)
    : undefined;
  const active = Boolean(current?.active);
  const payload = (current?.payload ?? {}) as Record<string, unknown>;

  const share = useCallback(
    (next?: Record<string, unknown>) => {
      if (!broadcastKey) return;
      setBroadcast.mutate({ widgetKey: broadcastKey, active: true, payload: next });
    },
    [broadcastKey, setBroadcast],
  );
  const stop = useCallback(() => {
    if (!broadcastKey) return;
    setBroadcast.mutate({ widgetKey: broadcastKey, active: false });
  }, [broadcastKey, setBroadcast]);

  return { active, payload, share, stop, isPending: setBroadcast.isPending };
}

/** Live count of players watching the shared player view. */
export function usePresence(campaignId: string) {
  return useQuery({
    queryKey: ["presence", campaignId],
    enabled: Boolean(campaignId),
    queryFn: () => api.get<{ count: number }>(`/api/campaigns/${campaignId}/presence`),
  });
}
