import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import type { PublicLocation } from "@toolkit/shared";
import { TokenView, GridOverlay } from "../modules/map/TokenView.js";

/**
 * The broadcasted map, zoomable/pannable for players. Pins are pre-filtered
 * server-side (hidden pins stripped); reveals are rectangular cutouts in a black
 * fog overlay. The fog/pin math is unchanged from the previous MapSection — it's
 * just wrapped in a pan/zoom surface and given fixed height so it can scroll.
 */
export function MapStage({ map }: { map: PublicLocation }) {
  const hasReveals = map.reveals.some((r) => r.mode === "reveal");
  const [aspect, setAspect] = useState(1);

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between border-b border-ink-700 px-4 py-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-300">{map.name}</h2>
        <span className="text-xs text-ink-500">scroll / pinch to zoom · double-tap to reset</span>
      </header>
      {map.playerNotes && (
        <p className="border-b border-ink-700 px-4 py-2 text-sm text-ink-200">{map.playerNotes}</p>
      )}

      {map.imageUrl ? (
        <div className="h-[60vh] bg-ink-950">
          <TransformWrapper
            minScale={0.5}
            maxScale={6}
            centerOnInit
            doubleClick={{ mode: "reset" }}
            wheel={{ step: 0.12 }}
          >
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ display: "flex" }}
            >
              <div className="relative inline-block">
                <img
                  src={map.imageUrl}
                  alt={map.name}
                  draggable={false}
                  className="block max-w-none"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalHeight > 0) setAspect(img.naturalWidth / img.naturalHeight);
                  }}
                />
                {hasReveals && (
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox="0 0 1 1"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <mask id="fog-mask" maskContentUnits="objectBoundingBox">
                        <rect x="0" y="0" width="1" height="1" fill="white" />
                        {map.reveals
                          .filter((r) => r.mode === "reveal")
                          .map((r) => (
                            <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill="black" />
                          ))}
                        {map.reveals
                          .filter((r) => r.mode === "hide")
                          .map((r) => (
                            <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill="white" />
                          ))}
                      </mask>
                    </defs>
                    <rect x="0" y="0" width="1" height="1" fill="rgba(0,0,0,0.92)" mask="url(#fog-mask)" />
                  </svg>
                )}
                {map.pins.map((p) => (
                  <div
                    key={p.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                  >
                    <div
                      className="h-4 w-4 rounded-full border-2 border-black/70 shadow"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.label && (
                      <span className="absolute left-4 top-0 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                        {p.label}
                      </span>
                    )}
                  </div>
                ))}
                {/* Grid overlay (drawn above the image, below tokens). */}
                {map.grid && <GridOverlay grid={map.grid} aspect={aspect} />}
                {/* Tokens — already fog/visibility-filtered server-side. */}
                {map.tokens.map((t) => (
                  <TokenView key={t.id} token={t} />
                ))}
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-ink-400">No map image.</div>
      )}
    </section>
  );
}
