import { useRef } from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { useCanvasStore } from "./store.js";
import { Widget } from "./Widget.js";
import { StickyLayer } from "../modules/sticky/StickyLayer.js";

interface Props {
  campaignId: string;
}

export function InfiniteCanvas({ campaignId }: Props) {
  const items = useCanvasStore((s) => s.layout.items);
  const viewport = useCanvasStore((s) => s.layout.viewport);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const ref = useRef<ReactZoomPanPinchRef | null>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-950">
      {/* Themed dot grid. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgb(var(--ink-50) / 0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Soft vignette for depth. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgb(var(--ink-950) / 0.85))",
        }}
      />

      {items.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
          <div className="rounded-xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-5 text-center text-ink-400 backdrop-blur-sm">
            <p className="display text-lg text-ink-200">Your canvas is empty</p>
            <p className="mt-1 text-sm">
              Press <kbd className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-xs text-ink-200">/</kbd>
              {" "}or <span className="text-ink-200">+ Add widget</span> to begin.
            </p>
          </div>
        </div>
      )}

      <TransformWrapper
        ref={ref}
        minScale={0.25}
        maxScale={3}
        limitToBounds={false}
        initialPositionX={viewport.x}
        initialPositionY={viewport.y}
        initialScale={viewport.scale}
        panning={{
          excluded: ["no-pan"],
          velocityDisabled: true,
        }}
        wheel={{ step: 0.1, smoothStep: 0.005 }}
        doubleClick={{ disabled: true }}
        onTransformed={(_r, state) => {
          setViewport({ x: state.positionX, y: state.positionY, scale: state.scale });
        }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: 6000, height: 6000 }}
        >
          <div className="relative h-[6000px] w-[6000px]">
            {items.map((item) => (
              <Widget key={item.instanceId} campaignId={campaignId} item={item} />
            ))}
            <StickyLayer campaignId={campaignId} />
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
