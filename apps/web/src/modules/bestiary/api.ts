import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMonsterInput, Monster, UpdateMonsterInput } from "@toolkit/shared";
import { api } from "../../api/client.js";

interface Filters {
  campaignId?: string;
  q?: string;
  tag?: string;
  type?: string;
  environment?: string;
}

const baseKey = ["monsters"] as const;
const listKey = (f: Filters) => [...baseKey, "list", f] as const;

function toQuery(f: Filters) {
  const sp = new URLSearchParams();
  if (f.campaignId) sp.set("campaignId", f.campaignId);
  if (f.q) sp.set("q", f.q);
  if (f.tag) sp.set("tag", f.tag);
  if (f.type) sp.set("type", f.type);
  if (f.environment) sp.set("environment", f.environment);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function useMonsters(filters: Filters) {
  return useQuery({
    queryKey: listKey(filters),
    queryFn: () => api.get<Monster[]>(`/api/monsters${toQuery(filters)}`),
  });
}

export function useCreateMonster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMonsterInput) => api.post<Monster>("/api/monsters", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: baseKey }),
  });
}

export function useUpdateMonster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateMonsterInput }) =>
      api.patch<Monster>(`/api/monsters/${args.id}`, args.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: baseKey }),
  });
}

export function useDeleteMonster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/monsters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: baseKey }),
  });
}
