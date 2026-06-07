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

/** Live count of players watching the shared player view. */
export function usePresence(campaignId: string) {
  return useQuery({
    queryKey: ["presence", campaignId],
    enabled: Boolean(campaignId),
    queryFn: () => api.get<{ count: number }>(`/api/campaigns/${campaignId}/presence`),
  });
}
