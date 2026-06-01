import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateStickyNoteInput,
  StickyNote,
  UpdateStickyNoteInput,
} from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["sticky", campaignId] as const;

export function useStickyNotes(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () =>
      api.get<StickyNote[]>(`/api/campaigns/${campaignId}/sticky-notes`),
  });
}

export function useCreateStickyNote(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStickyNoteInput) =>
      api.post<StickyNote>(`/api/campaigns/${campaignId}/sticky-notes`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdateStickyNote(campaignId: string) {
  // Intentionally no cache invalidation on update: drag, resize, and text edits
  // fire frequently. The next refetch (or SSE event) reconciles.
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateStickyNoteInput }) =>
      api.patch<StickyNote>(
        `/api/campaigns/${campaignId}/sticky-notes/${args.id}`,
        args.input,
      ),
  });
}

export function useDeleteStickyNote(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/campaigns/${campaignId}/sticky-notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}
