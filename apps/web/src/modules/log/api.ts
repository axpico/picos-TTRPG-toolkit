import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateLogEntryInput, LogEntry } from "@toolkit/shared";
import { api } from "../../api/client.js";

export function useLog(campaignId: string, limit = 200) {
  return useQuery({
    queryKey: ["log", campaignId],
    enabled: Boolean(campaignId),
    queryFn: () => api.get<LogEntry[]>(`/api/campaigns/${campaignId}/log?limit=${limit}`),
  });
}

export function useAddLogNote(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLogEntryInput) =>
      api.post<LogEntry>(`/api/campaigns/${campaignId}/log`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["log", campaignId] }),
  });
}
