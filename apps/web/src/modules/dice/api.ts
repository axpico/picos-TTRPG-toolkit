import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DiceRoll, CreateDiceInput } from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["dice", campaignId] as const;

export function useDiceHistory(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () => api.get<DiceRoll[]>(`/api/campaigns/${campaignId}/dice`),
  });
}

export function useRollDice(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDiceInput) =>
      api.post<DiceRoll>(`/api/campaigns/${campaignId}/dice`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}
