import { create } from "zustand";
import type { Layout, LayoutItem } from "@toolkit/shared";
import { defaultLayout } from "@toolkit/shared";

interface CanvasState {
  hydrated: boolean;
  layout: Layout;
  /** UI-only: when true, widgets cannot be dragged or resized. */
  locked: boolean;
  setLayout: (layout: Layout) => void;
  upsertItem: (item: LayoutItem) => void;
  patchItem: (instanceId: string, patch: Partial<LayoutItem>) => void;
  removeItem: (instanceId: string) => void;
  setViewport: (viewport: Layout["viewport"]) => void;
  setLocked: (locked: boolean) => void;
  reset: () => void;
}

const LOCK_STORAGE_KEY = "ttrpg.canvas.locked";

function readLocked(): boolean {
  try {
    return localStorage.getItem(LOCK_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export const useCanvasStore = create<CanvasState>((set) => ({
  hydrated: false,
  layout: defaultLayout,
  locked: readLocked(),
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
  setLocked: (locked) => {
    try {
      localStorage.setItem(LOCK_STORAGE_KEY, locked ? "1" : "0");
    } catch {
      // Storage unavailable (private mode); lock still works for the session.
    }
    set({ locked });
  },
  reset: () => set({ hydrated: false, layout: defaultLayout }),
}));
