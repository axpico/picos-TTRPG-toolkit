import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Combatant,
  CreateCombatantInput,
  CreateEncounterInput,
  Encounter,
  UpdateCombatantInput,
  UpdateEncounterInput,
} from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["combat", campaignId] as const;

export function useEncounters(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () => api.get<Encounter[]>(`/api/campaigns/${campaignId}/encounters`),
  });
}

export function useCreateEncounter(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEncounterInput) =>
      api.post<Encounter>(`/api/campaigns/${campaignId}/encounters`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdateEncounter(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateEncounterInput }) =>
      api.patch<Encounter>(
        `/api/campaigns/${campaignId}/encounters/${args.id}`,
        args.input,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useDeleteEncounter(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/campaigns/${campaignId}/encounters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useNextTurn(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (encounterId: string) =>
      api.post<Encounter>(
        `/api/campaigns/${campaignId}/encounters/${encounterId}/next-turn`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function usePrevTurn(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (encounterId: string) =>
      api.post<Encounter>(
        `/api/campaigns/${campaignId}/encounters/${encounterId}/prev-turn`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useRollInitiative(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { encounterId: string; onlyNpc?: boolean }) =>
      api.post<Encounter>(
        `/api/campaigns/${campaignId}/encounters/${args.encounterId}/roll-initiative`,
        { onlyNpc: args.onlyNpc ?? false },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useAddCombatant(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { encounterId: string; input: CreateCombatantInput }) =>
      api.post<Combatant>(
        `/api/campaigns/${campaignId}/encounters/${args.encounterId}/combatants`,
        args.input,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdateCombatant(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { encounterId: string; id: string; input: UpdateCombatantInput }) =>
      api.patch<Combatant>(
        `/api/campaigns/${campaignId}/encounters/${args.encounterId}/combatants/${args.id}`,
        args.input,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useRemoveCombatant(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { encounterId: string; id: string }) =>
      api.delete(
        `/api/campaigns/${campaignId}/encounters/${args.encounterId}/combatants/${args.id}`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}
