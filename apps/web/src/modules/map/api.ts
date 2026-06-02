import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Asset,
  CreateLocationInput,
  Location,
  UpdateLocationInput,
} from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["locations", campaignId] as const;

export function useLocations(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () => api.get<Location[]>(`/api/campaigns/${campaignId}/locations`),
  });
}

export function useCreateLocation(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLocationInput) =>
      api.post<Location>(`/api/campaigns/${campaignId}/locations`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdateLocation(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateLocationInput }) =>
      api.patch<Location>(
        `/api/campaigns/${campaignId}/locations/${args.id}`,
        args.input,
      ),
    // Optimistically patch the cached location so rapid drag/edit gestures don't
    // wait on the round-trip or trigger a refetch flicker.
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: key(campaignId) });
      const previous = qc.getQueryData<Location[]>(key(campaignId));
      qc.setQueryData<Location[]>(key(campaignId), (list) =>
        list?.map((loc) => {
          if (loc.id !== id) return loc;
          const { tokens: inputTokens, ...rest } = input;
          // The PATCH body carries stored tokens (no imageUrl); re-derive the DTO
          // imageUrl optimistically from the previously-cached token of the same id.
          const tokens =
            inputTokens === undefined
              ? loc.tokens
              : inputTokens.map((t) => ({
                  ...t,
                  imageUrl: loc.tokens.find((o) => o.id === t.id)?.imageUrl ?? null,
                }));
          return { ...loc, ...rest, tokens };
        }),
      );
      return { previous };
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.previous) qc.setQueryData(key(campaignId), ctx.previous);
    },
    // Reconcile with the authoritative server copy (e.g. updatedAt, imageUrl)
    // without a separate refetch.
    onSuccess: (loc) => {
      qc.setQueryData<Location[]>(key(campaignId), (list) =>
        list?.map((l) => (l.id === loc.id ? loc : l)),
      );
    },
  });
}

export function useDeleteLocation(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/campaigns/${campaignId}/locations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUploadAsset() {
  return useMutation({
    mutationFn: (file: File) => api.upload<Asset>(`/api/uploads/upload`, file),
  });
}
