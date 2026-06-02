import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Campaign, CreateCampaignInput, UpdateCampaignInput } from "@toolkit/shared";
import { api } from "../api/client.js";

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["campaigns"] });
  qc.invalidateQueries({ queryKey: ["auth"] }); // memberships live on /me
};

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
    onSuccess: () => invalidateAll(qc),
  });
}

export function useJoinCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (joinCode: string) =>
      api.post<Campaign>("/api/campaigns/join", { joinCode }),
    onSuccess: () => invalidateAll(qc),
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
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRotateJoinCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Campaign>(`/api/campaigns/${id}/join-code/rotate`),
    onSuccess: (c) => {
      qc.setQueryData(["campaigns", c.id], c);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
