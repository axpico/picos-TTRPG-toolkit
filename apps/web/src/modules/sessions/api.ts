import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSessionInput,
  SessionEntry,
  UpdateSessionInput,
} from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["sessions", campaignId] as const;

export function useSessions(campaignId: string, q?: string) {
  return useQuery({
    queryKey: [...key(campaignId), q ?? ""] as const,
    enabled: Boolean(campaignId),
    queryFn: () =>
      api.get<SessionEntry[]>(
        `/api/campaigns/${campaignId}/sessions${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      ),
  });
}

export function useSession(campaignId: string, sessionId: string | null) {
  return useQuery({
    queryKey: ["session", campaignId, sessionId],
    enabled: Boolean(campaignId && sessionId),
    queryFn: () =>
      api.get<SessionEntry>(`/api/campaigns/${campaignId}/sessions/${sessionId}`),
  });
}

export function useCreateSession(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSessionInput) =>
      api.post<SessionEntry>(`/api/campaigns/${campaignId}/sessions`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdateSession(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateSessionInput }) =>
      api.patch<SessionEntry>(
        `/api/campaigns/${campaignId}/sessions/${args.id}`,
        args.input,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: key(campaignId) });
      qc.invalidateQueries({ queryKey: ["session", campaignId, vars.id] });
    },
  });
}

export function useDeleteSession(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/campaigns/${campaignId}/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}
