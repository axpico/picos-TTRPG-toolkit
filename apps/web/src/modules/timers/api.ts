import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTimerInput, Timer, UpdateTimerInput } from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["timers", campaignId] as const;

export function useTimers(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () => api.get<Timer[]>(`/api/campaigns/${campaignId}/timers`),
  });
}

export function useCreateTimer(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimerInput) =>
      api.post<Timer>(`/api/campaigns/${campaignId}/timers`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdateTimer(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTimerInput }) =>
      api.patch<Timer>(`/api/campaigns/${campaignId}/timers/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useDeleteTimer(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/campaigns/${campaignId}/timers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}
