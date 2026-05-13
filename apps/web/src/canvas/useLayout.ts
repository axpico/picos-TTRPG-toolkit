import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Layout } from "@toolkit/shared";
import { api } from "../api/client.js";
import { useCanvasStore } from "./store.js";

const DEBOUNCE_MS = 500;

export function useLayoutSync(campaignId: string) {
  const setLayout = useCanvasStore((s) => s.setLayout);
  const layout = useCanvasStore((s) => s.layout);
  const hydrated = useCanvasStore((s) => s.hydrated);

  // Initial load.
  const query = useQuery({
    queryKey: ["layout", campaignId],
    queryFn: () => api.get<Layout>(`/api/campaigns/${campaignId}/layout`),
    enabled: Boolean(campaignId),
  });

  useEffect(() => {
    if (query.data) {
      setLayout(query.data);
    }
  }, [query.data, setLayout]);

  // Debounced persist after each local change.
  const timer = useRef<number | undefined>(undefined);
  const lastSent = useRef<string>("");
  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(layout);
    if (serialized === lastSent.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      lastSent.current = serialized;
      void api.put(`/api/campaigns/${campaignId}/layout`, layout).catch((err) => {
        console.error("[layout] persist failed", err);
      });
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [layout, hydrated, campaignId]);

  return {
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
