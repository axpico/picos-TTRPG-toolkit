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
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
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
