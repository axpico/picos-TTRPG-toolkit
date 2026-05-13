import { useRef } from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { useCanvasStore } from "./store.js";
import { Widget } from "./Widget.js";

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
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
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
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
