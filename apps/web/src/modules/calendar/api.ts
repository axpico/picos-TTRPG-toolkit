import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdvanceCalendarInput, Calendar, SetCalendarInput } from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["calendar", campaignId] as const;

export function useCalendar(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () => api.get<Calendar>(`/api/campaigns/${campaignId}/calendar`),
  });
}

export function useSetCalendar(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetCalendarInput) =>
      api.patch<Calendar>(`/api/campaigns/${campaignId}/calendar`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useAdvanceCalendar(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdvanceCalendarInput) =>
      api.post<Calendar>(`/api/campaigns/${campaignId}/calendar/advance`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}
