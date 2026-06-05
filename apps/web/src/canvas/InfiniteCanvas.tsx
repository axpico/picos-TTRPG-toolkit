import { useCallback, useEffect, useRef } from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { useCanvasStore } from "./store.js";
import { Widget } from "./Widget.js";
import { fitTransform, itemsBounds } from "./viewport.js";

interface Props {
  campaignId: string;
}

export function InfiniteCanvas({ campaignId }: Props) {
  const items = useCanvasStore((s) => s.layout.items);
  const viewport = useCanvasStore((s) => s.layout.viewport);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const ref = useRef<ReactZoomPanPinchRef | null>(null);

  // Zoom/pan so every placed widget fits the viewport, centered. The resulting
  // transform round-trips into the store via onTransformed below.
  const fitToWidgets = useCallback(() => {
    const api = ref.current;
    const wrap = api?.instance.wrapperComponent;
    if (!api || !wrap) return;
    const bounds = itemsBounds(items);
    if (!bounds) return;
    // Allow fit to zoom out far below the interactive minScale so widgets that
    // are spread across the canvas still get framed (clamping up to 0.25 would
    // center the empty middle of the bbox with the widgets off-screen). Cap at
    // 1x so a small cluster is framed, not magnified past its natural size.
    const { x, y, scale } = fitTransform(bounds, wrap.clientWidth, wrap.clientHeight, {
      minScale: 0.05,
      maxScale: 1,
    });
    api.setTransform(x, y, scale, 300, "easeOut");
  }, [items]);

  // Global shortcut: "F" fits all widgets to the viewport.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
      if ((e.key === "f" || e.key === "F") && !typing) {
        e.preventDefault();
        fitToWidgets();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fitToWidgets]);

  // Grid cells are anchored to canvas (content) space so the background pans and
  // zooms with the widgets, giving the DM real spatial feedback while navigating.
  // 32 content-units = one minor cell; 8 minor cells = one major cell.
  const minorCell = 32 * viewport.scale;
  const majorCell = minorCell * 8;
  const bgPos = `${viewport.x}px ${viewport.y}px`;
  // Fade the fine dot grid out as it gets too dense (zoomed far out) so it never
  // turns into noise; full strength once cells are comfortably spaced.
  const minorOpacity = Math.max(0, Math.min(1, (minorCell - 10) / 14));

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-950">
      {/* Ambient accent wash for depth and theming. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 50% -10%, rgb(var(--accent-500) / 0.10), transparent 60%)",
        }}
      />
      {/* Major grid lines — coarse orientation that survives at low zoom. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(var(--ink-50) / 0.04) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgb(var(--ink-50) / 0.04) 1px, transparent 1px)",
          backgroundSize: `${majorCell}px ${majorCell}px`,
          backgroundPosition: bgPos,
        }}
      />
      {/* Fine dot grid — fine-grained alignment, anchored to canvas space. */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          backgroundImage:
            "radial-gradient(rgb(var(--ink-50) / 0.08) 1.25px, transparent 1.5px)",
          backgroundSize: `${minorCell}px ${minorCell}px`,
          backgroundPosition: bgPos,
          opacity: minorOpacity,
        }}
      />
      {/* Soft vignette for focus. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgb(var(--ink-950) / 0.9))",
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
        minScale={0.05}
        maxScale={3}
        limitToBounds={false}
        initialPositionX={viewport.x}
        initialPositionY={viewport.y}
        initialScale={viewport.scale}
        panning={{
          excluded: ["no-pan"],
          velocityDisabled: true,
        }}
        wheel={{ step: 0.1, smoothStep: 0.005, excluded: ["no-pan"] }}
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

      {/* Fit-all-widgets control. */}
      <button
        type="button"
        onClick={fitToWidgets}
        disabled={items.length === 0}
        title="Fit all widgets (F)"
        aria-label="Fit all widgets to view"
        className="no-pan absolute bottom-4 right-4 z-[2] flex h-10 w-10 items-center justify-center rounded-lg border border-ink-700 bg-ink-900/70 text-ink-200 backdrop-blur-sm transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
        </svg>
      </button>
    </div>
  );
}
