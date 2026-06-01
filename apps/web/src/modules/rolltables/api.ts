import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateRollTableInput,
  RollTable,
  RollTableResult,
  UpdateRollTableInput,
} from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["rolltables", campaignId] as const;

export function useRollTables(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () => api.get<RollTable[]>(`/api/campaigns/${campaignId}/rolltables`),
  });
}

export function useCreateTable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRollTableInput) =>
      api.post<RollTable>(`/api/campaigns/${campaignId}/rolltables`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdateTable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRollTableInput }) =>
      api.patch<RollTable>(`/api/campaigns/${campaignId}/rolltables/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useDeleteTable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/campaigns/${campaignId}/rolltables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useRollOnTable(campaignId: string) {
  return useMutation({
    mutationFn: (tableId: string) =>
      api.post<RollTableResult>(`/api/campaigns/${campaignId}/rolltables/${tableId}/roll`),
  });
}
