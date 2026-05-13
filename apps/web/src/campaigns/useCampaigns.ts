import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Campaign, CreateCampaignInput, UpdateCampaignInput } from "@toolkit/shared";
import { api } from "../api/client.js";

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => api.get<Campaign[]>("/api/campaigns"),
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ["campaigns", id],
    enabled: Boolean(id),
    queryFn: () => api.get<Campaign>(`/api/campaigns/${id}`),
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampaignInput) =>
      api.post<Campaign>("/api/campaigns", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateCampaignInput }) =>
      api.patch<Campaign>(`/api/campaigns/${args.id}`, args.input),
    onSuccess: (c) => {
      qc.setQueryData(["campaigns", c.id], c);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useRotateShareToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Campaign>(`/api/campaigns/${id}/share-token/rotate`),
    onSuccess: (c) => {
      qc.setQueryData(["campaigns", c.id], c);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
