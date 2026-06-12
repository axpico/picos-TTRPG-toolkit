import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSpellInput,
  Spell,
  SpellImportStatus,
  UpdateSpellInput,
} from "@toolkit/shared";
import { api } from "../../api/client.js";

interface Filters {
  campaignId?: string;
  includeGlobal?: boolean;
  q?: string;
  level?: number;
  school?: string;
  class?: string;
  tag?: string;
}

const baseKey = ["spells"] as const;
const listKey = (f: Filters) => [...baseKey, "list", f] as const;
const importKey = [...baseKey, "import"] as const;

function toQuery(f: Filters) {
  const sp = new URLSearchParams();
  if (f.campaignId) sp.set("campaignId", f.campaignId);
  if (f.includeGlobal) sp.set("includeGlobal", "true");
  if (f.q) sp.set("q", f.q);
  if (f.level !== undefined) sp.set("level", String(f.level));
  if (f.school) sp.set("school", f.school);
  if (f.class) sp.set("class", f.class);
  if (f.tag) sp.set("tag", f.tag);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function useSpells(filters: Filters) {
  return useQuery({
    queryKey: listKey(filters),
    queryFn: () => api.get<Spell[]>(`/api/spells${toQuery(filters)}`),
  });
}

export function useCreateSpell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpellInput) => api.post<Spell>("/api/spells", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: baseKey }),
  });
}

export function useUpdateSpell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateSpellInput }) =>
      api.patch<Spell>(`/api/spells/${args.id}`, args.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: baseKey }),
  });
}

export function useDeleteSpell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/spells/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: baseKey }),
  });
}

/** Poll the import job; refetches every second only while a run is active. */
export function useImportStatus(enabled: boolean) {
  return useQuery({
    queryKey: importKey,
    queryFn: () => api.get<SpellImportStatus>("/api/spells/import/status"),
    enabled,
    refetchInterval: (query) => (query.state.data?.status === "running" ? 1000 : false),
  });
}

export function useStartImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input?: { includeUnofficial?: boolean }) =>
      api.post<{ started: boolean; status: SpellImportStatus }>("/api/spells/import", input ?? {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: baseKey }),
  });
}
