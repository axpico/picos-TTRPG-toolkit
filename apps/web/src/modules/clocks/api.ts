import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateClockInput, ProgressClock, UpdateClockInput } from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["clocks", campaignId] as const;

export function useClocks(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () => api.get<ProgressClock[]>(`/api/campaigns/${campaignId}/clocks`),
  });
}

export function useCreateClock(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClockInput) =>
      api.post<ProgressClock>(`/api/campaigns/${campaignId}/clocks`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdateClock(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateClockInput }) =>
      api.patch<ProgressClock>(`/api/campaigns/${campaignId}/clocks/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useDeleteClock(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/campaigns/${campaignId}/clocks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}
