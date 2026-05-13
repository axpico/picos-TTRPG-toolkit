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
