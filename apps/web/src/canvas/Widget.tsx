import { useCallback } from "react";
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

export function Widget({ campaignId, item }: Props) {
  const patchItem = useCanvasStore((s) => s.patchItem);
  const removeItem = useCanvasStore((s) => s.removeItem);
  // The widget lives inside the zoom/pan-scaled canvas, so react-rnd must divide
  // pointer deltas by the current zoom to track the cursor 1:1.
  const scale = useCanvasStore((s) => s.layout.viewport.scale);

  const def = getWidget(item.moduleType);

  const setState = useCallback(
    (patch: Record<string, unknown>) => {
      patchItem(item.instanceId, { state: { ...(item.state ?? {}), ...patch } });
    },
    [item.instanceId, item.state, patchItem],
  );

  if (!def) {
    return (
      <Rnd
        className="no-pan"
        dragHandleClassName={DRAG_HANDLE}
        scale={scale}
        position={{ x: item.x, y: item.y }}
        size={{ width: item.w, height: item.h }}
        bounds="parent"
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
        <div className="card flex h-full flex-col">
          <header className={`${DRAG_HANDLE} flex items-center justify-between border-b border-ink-700 px-3 py-1.5 text-sm font-medium`}>
            <span className="cursor-grab text-ink-300">Unknown widget: {item.moduleType}</span>
            <button className="btn-ghost" onClick={() => removeItem(item.instanceId)}>×</button>
          </header>
          <div className="flex-1 overflow-auto p-3 text-sm text-ink-400">
            No widget registered for type "{item.moduleType}".
          </div>
        </div>
      </Rnd>
    );
  }

  const broadcastKey = def.broadcastKey ?? `${def.type}:${item.instanceId}`;
  const Body = def.Component;

  return (
    <Rnd
      className="no-pan"
      dragHandleClassName={DRAG_HANDLE}
      scale={scale}
      position={{ x: item.x, y: item.y }}
      size={{ width: item.w, height: item.h }}
      minWidth={220}
      minHeight={160}
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
      <div className="card flex h-full flex-col overflow-hidden">
        <header
          className={`${DRAG_HANDLE} flex cursor-grab select-none items-center justify-between border-b border-ink-700/80 bg-ink-800/70 px-3 py-1.5 text-sm font-medium`}
        >
          <span className="display tracking-wide text-ink-50">{def.title}</span>
          <div className="flex items-center gap-1">
            {def.broadcastKey !== undefined && (
              <BroadcastToggle campaignId={campaignId} widgetKey={broadcastKey} />
            )}
            <button
              className="btn-ghost h-7 px-2"
              onClick={() => removeItem(item.instanceId)}
              title="Close widget"
            >
              ×
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <Body
            campaignId={campaignId}
            instanceId={item.instanceId}
            state={item.state}
            setState={setState}
            broadcastKey={broadcastKey}
          />
        </div>
      </div>
    </Rnd>
  );
}
