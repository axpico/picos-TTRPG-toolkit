import { useQuery } from "@tanstack/react-query";
import type { LogEntry } from "@toolkit/shared";
import { api } from "../../api/client.js";

export function useLog(campaignId: string, limit = 200) {
  return useQuery({
    queryKey: ["log", campaignId],
    enabled: Boolean(campaignId),
    queryFn: () => api.get<LogEntry[]>(`/api/campaigns/${campaignId}/log?limit=${limit}`),
  });
}
