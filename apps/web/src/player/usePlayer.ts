import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Broadcast,
  Calendar,
  Encounter,
  PartyMember,
  PublicLocation,
  RollTableResult,
  UpdateMyCharacterInput,
  Weather,
} from "@toolkit/shared";
import { api } from "../api/client.js";

export interface PlayerState {
  campaign: { id: string; name: string };
  broadcasts: Broadcast[];
  data: {
    party: PartyMember[] | null;
    combat: Encounter | null;
    weather: Weather | null;
    calendar: Calendar | null;
    map: PublicLocation | null;
    rolltable: RollTableResult | null;
  };
}

export function usePlayerState(campaignId: string) {
  return useQuery({
    queryKey: ["player", campaignId],
    enabled: Boolean(campaignId),
    queryFn: () => api.get<PlayerState>(`/api/campaigns/${campaignId}/player-state`),
  });
}

export function useMyCharacter(campaignId: string) {
  return useQuery({
    queryKey: ["my-character", campaignId],
    enabled: Boolean(campaignId),
    queryFn: () => api.get<PartyMember | null>(`/api/campaigns/${campaignId}/my-character`),
  });
}

export function useUpdateMyCharacter(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMyCharacterInput) =>
      api.patch<PartyMember>(`/api/campaigns/${campaignId}/my-character`, input),
    onSuccess: (m) => {
      qc.setQueryData(["my-character", campaignId], m);
      qc.invalidateQueries({ queryKey: ["player", campaignId] });
    },
  });
}
