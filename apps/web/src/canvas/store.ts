import { create } from "zustand";
import type { Layout, LayoutItem } from "@toolkit/shared";
import { defaultLayout } from "@toolkit/shared";

interface CanvasState {
  hydrated: boolean;
  layout: Layout;
  setLayout: (layout: Layout) => void;
  upsertItem: (item: LayoutItem) => void;
  patchItem: (instanceId: string, patch: Partial<LayoutItem>) => void;
  removeItem: (instanceId: string) => void;
  setViewport: (viewport: Layout["viewport"]) => void;
  reset: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  hydrated: false,
  layout: defaultLayout,
  setLayout: (layout) => set({ layout, hydrated: true }),
  upsertItem: (item) =>
    set((s) => {
      const items = s.layout.items.filter((i) => i.instanceId !== item.instanceId);
      items.push(item);
      return { layout: { ...s.layout, items } };
    }),
  patchItem: (instanceId, patch) =>
    set((s) => ({
      layout: {
        ...s.layout,
        items: s.layout.items.map((i) =>
          i.instanceId === instanceId ? { ...i, ...patch } : i,
        ),
      },
    })),
  removeItem: (instanceId) =>
    set((s) => ({
      layout: {
        ...s.layout,
        items: s.layout.items.filter((i) => i.instanceId !== instanceId),
      },
    })),
  setViewport: (viewport) =>
    set((s) => ({ layout: { ...s.layout, viewport } })),
  reset: () => set({ hydrated: false, layout: defaultLayout }),
}));
