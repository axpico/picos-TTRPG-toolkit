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
    // The PATCH returns the full updated Weather, so write it straight into the
    // cache instead of invalidating — avoids a second round-trip per save.
    onSuccess: (weather) => qc.setQueryData(key(campaignId), weather),
  });
}

export function useRollWeather(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<Weather>(`/api/campaigns/${campaignId}/weather/roll`),
    onSuccess: (weather) => qc.setQueryData(key(campaignId), weather),
  });
}
