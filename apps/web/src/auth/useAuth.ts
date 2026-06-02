import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthMe, LoginInput, Membership, RegisterInput } from "@toolkit/shared";
import { api } from "../api/client.js";

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<AuthMe>("/api/auth/me"),
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<AuthMe>("/api/auth/login", input),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api.post<AuthMe>("/api/auth/register", input),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<AuthMe>("/api/auth/logout"),
    onSuccess: () => qc.invalidateQueries(),
  });
}

/** Split a user's memberships into the campaigns they run vs. play in. */
export function splitMemberships(memberships: Membership[] | undefined) {
  const running = (memberships ?? []).filter((m) => m.role === "dm").map((m) => m.campaignId);
  const playing = (memberships ?? []).filter((m) => m.role === "player").map((m) => m.campaignId);
  return { running, playing };
}

/** The caller's role in a given campaign, if any. */
export function roleIn(memberships: Membership[] | undefined, campaignId: string) {
  return (memberships ?? []).find((m) => m.campaignId === campaignId)?.role;
}
