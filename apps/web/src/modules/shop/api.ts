import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateShopInput,
  CreateShopItemInput,
  GenerateShopInput,
  PartyMember,
  PurchaseShopItemInput,
  Shop,
  ShopItem,
  UpdateShopInput,
  UpdateShopItemInput,
} from "@toolkit/shared";
import { api } from "../../api/client.js";

const key = (campaignId: string) => ["shops", campaignId] as const;

export function useShops(campaignId: string) {
  return useQuery({
    queryKey: key(campaignId),
    enabled: Boolean(campaignId),
    queryFn: () => api.get<Shop[]>(`/api/campaigns/${campaignId}/shops`),
  });
}

export function useCreateShop(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShopInput) =>
      api.post<Shop>(`/api/campaigns/${campaignId}/shops`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdateShop(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateShopInput }) =>
      api.patch<Shop>(`/api/campaigns/${campaignId}/shops/${args.id}`, args.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useDeleteShop(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/campaigns/${campaignId}/shops/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useGenerateShop(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateShopInput) =>
      api.post<Shop>(`/api/campaigns/${campaignId}/shops/generate`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useCreateShopItem(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { shopId: string; input: CreateShopItemInput }) =>
      api.post<ShopItem>(
        `/api/campaigns/${campaignId}/shops/${args.shopId}/items`,
        args.input,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function useUpdateShopItem(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { shopId: string; id: string; input: UpdateShopItemInput }) =>
      api.patch<ShopItem>(
        `/api/campaigns/${campaignId}/shops/${args.shopId}/items/${args.id}`,
        args.input,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}

export function usePurchaseItem(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { shopId: string; itemId: string; input: PurchaseShopItemInput }) =>
      api.post<{ member: PartyMember; item: ShopItem }>(
        `/api/campaigns/${campaignId}/shops/${args.shopId}/items/${args.itemId}/purchase`,
        args.input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(campaignId) });
      qc.invalidateQueries({ queryKey: ["party", campaignId] });
    },
  });
}

export function useDeleteShopItem(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { shopId: string; id: string }) =>
      api.delete(
        `/api/campaigns/${campaignId}/shops/${args.shopId}/items/${args.id}`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(campaignId) }),
  });
}
