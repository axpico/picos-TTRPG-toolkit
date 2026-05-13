import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateNpcInput,
  GeneratedNpc,
  GenerateNpcInput,
  NPC,
  UpdateNpcInput,
} from "@toolkit/shared";
import { api } from "../../api/client.js";

interface NpcListFilters {
  campaignId?: string;
  q?: string;
  tag?: string;
  favorite?: boolean;
}

const baseKey = ["npcs"] as const;
const listKey = (f: NpcListFilters) => [...baseKey, "list", f] as const;

function toQuery(f: NpcListFilters) {
  const sp = new URLSearchParams();
  if (f.campaignId) sp.set("campaignId", f.campaignId);
  if (f.q) sp.set("q", f.q);
  if (f.tag) sp.set("tag", f.tag);
  if (f.favorite) sp.set("favorite", "true");
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function useNpcs(filters: NpcListFilters) {
  return useQuery({
    queryKey: listKey(filters),
    queryFn: () => api.get<NPC[]>(`/api/npcs${toQuery(filters)}`),
  });
}

export function useCreateNpc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNpcInput) => api.post<NPC>("/api/npcs", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: baseKey }),
  });
}

export function useUpdateNpc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateNpcInput }) =>
      api.patch<NPC>(`/api/npcs/${args.id}`, args.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: baseKey }),
  });
}

export function useDeleteNpc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/npcs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: baseKey }),
  });
}

export function useGenerateNpc() {
  return useMutation({
    mutationFn: (input: GenerateNpcInput) =>
      api.post<{ npcs: GeneratedNpc[] }>("/api/npcs/generate", input),
  });
}
