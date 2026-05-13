import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SetWeatherInput, Weather } from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["weather", campaignId] as const;

export function useWeather(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () => api.get<Weather>(`/api/campaigns/${campaignId}/weather`),
  });
}

export function useSetWeather(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetWeatherInput) =>
      api.patch<Weather>(`/api/campaigns/${campaignId}/weather`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useRollWeather(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<Weather>(`/api/campaigns/${campaignId}/weather/roll`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}
