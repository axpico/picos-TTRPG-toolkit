import { useCallback, type ReactNode } from "react";
import { Rnd } from "react-rnd";
import type { LayoutItem } from "@toolkit/shared";
import { getWidget } from "./WidgetRegistry.js";
import { useCanvasStore } from "./store.js";
import { BroadcastToggle } from "../modules/broadcast/BroadcastToggle.js";

const DRAG_HANDLE = "ttrpg-widget__handle";

interface Props {
  campaignId: string;
  item: LayoutItem;
}

/** Shared draggable/resizable frame for both known and unknown widget types. */
function WidgetFrame({
  item,
  title,
  headerActions,
  children,
  minWidth,
  minHeight,
}: {
  item: LayoutItem;
  title: string;
  headerActions: ReactNode;
  children: ReactNode;
  minWidth?: number;
  minHeight?: number;
}) {
  const patchItem = useCanvasStore((s) => s.patchItem);
  const locked = useCanvasStore((s) => s.locked);
  // The widget lives inside the zoom/pan-scaled canvas, so react-rnd must divide
  // pointer deltas by the current zoom to track the cursor 1:1.
  const scale = useCanvasStore((s) => s.layout.viewport.scale);

  return (
    <Rnd
      className="no-pan"
      dragHandleClassName={DRAG_HANDLE}
      scale={scale}
      position={{ x: item.x, y: item.y }}
      size={{ width: item.w, height: item.h }}
      minWidth={minWidth}
      minHeight={minHeight}
      bounds="parent"
      disableDragging={locked}
      enableResizing={!locked}
      onDragStop={(_e, d) => patchItem(item.instanceId, { x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        patchItem(item.instanceId, {
          w: parseFloat(ref.style.width),
          h: parseFloat(ref.style.height),
          x: pos.x,
          y: pos.y,
        })
      }
    >
      <section aria-label={title} className="card flex h-full flex-col overflow-hidden">
        <header
          className={`${DRAG_HANDLE} flex select-none items-center justify-between border-b border-ink-700/80 bg-ink-800/70 px-3 py-1.5 text-sm font-medium ${
            locked ? "" : "cursor-grab"
          }`}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {!locked && (
              <span aria-hidden="true" className="shrink-0 text-xs text-ink-500">
                ⠿
              </span>
            )}
            <span title={title} className="display truncate tracking-wide text-ink-50">
              {title}
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-1">{headerActions}</div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </section>
    </Rnd>
  );
}

export function Widget({ campaignId, item }: Props) {
  const patchItem = useCanvasStore((s) => s.patchItem);
  const removeItem = useCanvasStore((s) => s.removeItem);

  const def = getWidget(item.moduleType);

  const setState = useCallback(
    (patch: Record<string, unknown>) => {
      patchItem(item.instanceId, { state: { ...(item.state ?? {}), ...patch } });
    },
    [item.instanceId, item.state, patchItem],
  );

  const closeButton = (
    <button
      className="btn-ghost h-7 px-2"
      onClick={() => removeItem(item.instanceId)}
      title="Close widget"
      aria-label={`Close ${def?.title ?? item.moduleType} widget`}
    >
      ×
    </button>
  );

  if (!def) {
    return (
      <WidgetFrame item={item} title={`Unknown widget: ${item.moduleType}`} headerActions={closeButton}>
        <div className="p-3 text-sm text-ink-400">
          No widget registered for type "{item.moduleType}".
        </div>
      </WidgetFrame>
    );
  }

  const broadcastKey = def.broadcastKey ?? `${def.type}:${item.instanceId}`;
  const Body = def.Component;

  return (
    <WidgetFrame
      item={item}
      title={def.title}
      minWidth={220}
      minHeight={160}
      headerActions={
        <>
          {/* Every widget is live-shareable; the toggle gates player visibility. */}
          <BroadcastToggle campaignId={campaignId} widgetKey={broadcastKey} />
          {closeButton}
        </>
      }
    >
      <Body
        campaignId={campaignId}
        instanceId={item.instanceId}
        state={item.state}
        setState={setState}
        broadcastKey={broadcastKey}
      />
    </WidgetFrame>
  );
}
