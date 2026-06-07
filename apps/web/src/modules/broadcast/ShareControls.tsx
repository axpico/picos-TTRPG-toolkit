import { useMemo } from "react";
import clsx from "clsx";
import { useCanvasStore } from "../../canvas/store.js";
import { getWidget } from "../../canvas/WidgetRegistry.js";
import { useBroadcasts, usePresence, useSetBroadcasts } from "./api.js";

/**
 * GM dashboard control: Share-All / Hide-All across every widget on the board,
 * a live count of active broadcasts, and a presence badge of watching players.
 */
export function ShareControls({ campaignId }: { campaignId: string }) {
  const items = useCanvasStore((s) => s.layout.items);
  const broadcasts = useBroadcasts(campaignId);
  const presence = usePresence(campaignId);
  const setBroadcasts = useSetBroadcasts(campaignId);

  // Broadcast key per board widget, mirroring canvas/Widget.tsx's fallback rule.
  const widgetKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const it of items) {
      const def = getWidget(it.moduleType);
      if (!def) continue;
      keys.add(def.broadcastKey ?? `${def.type}:${it.instanceId}`);
    }
    return Array.from(keys);
  }, [items]);

  const activeCount = useMemo(() => {
    const active = new Set((broadcasts.data ?? []).filter((b) => b.active).map((b) => b.widgetKey));
    return widgetKeys.filter((k) => active.has(k)).length;
  }, [broadcasts.data, widgetKeys]);

  const watching = presence.data?.count ?? 0;
  const allLive = widgetKeys.length > 0 && activeCount === widgetKeys.length;
  const disabled = widgetKeys.length === 0 || setBroadcasts.isPending;

  const toggleAll = () =>
    setBroadcasts.mutate({ active: !allLive, widgetKeys });

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="chip border-ink-700 text-ink-300"
        title="Players currently watching the live view"
      >
        👥 {watching}
      </span>
      <button
        className={clsx(
          "btn h-7 px-2 text-xs",
          allLive
            ? "bg-accent-600 text-white hover:bg-accent-500"
            : "bg-ink-700 text-ink-200 hover:bg-ink-600",
        )}
        onClick={toggleAll}
        disabled={disabled}
        title={
          widgetKeys.length === 0
            ? "Add widgets to share them"
            : allLive
              ? "Stop sharing every widget"
              : "Share every widget on the board"
        }
      >
        {allLive ? "Hide all" : "Share all"}
        <span className="ml-1 text-[10px] opacity-80">
          {activeCount}/{widgetKeys.length}
        </span>
      </button>
    </div>
  );
}
