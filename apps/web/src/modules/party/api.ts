import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PartyMember, CreatePartyMemberInput, UpdatePartyMemberInput } from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["party", campaignId] as const;

export function useParty(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () => api.get<PartyMember[]>(`/api/campaigns/${campaignId}/party`),
  });
}

export function useCreatePartyMember(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePartyMemberInput) =>
      api.post<PartyMember>(`/api/campaigns/${campaignId}/party`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdatePartyMember(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdatePartyMemberInput }) =>
      api.patch<PartyMember>(`/api/campaigns/${campaignId}/party/${args.id}`, args.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useDeletePartyMember(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/campaigns/${campaignId}/party/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}
