import clsx from "clsx";
import type { MapGrid, MapTokenDto } from "@toolkit/shared";
import { HpBar } from "../shared.js";

function initialsOf(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * A map token rendered in normalized image space: positioned by `%` and sized by
 * `token.size` (fraction of the container width), kept circular via aspect-ratio.
 * Used read-only on the player stage and as the visual for the draggable GM token.
 */
export function TokenView({
  token,
  dimmed = false,
  hiddenFromPlayers = false,
}: {
  token: MapTokenDto;
  dimmed?: boolean;
  hiddenFromPlayers?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[2] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${token.x * 100}%`, top: `${token.y * 100}%`, width: `${token.size * 100}%` }}
    >
      <div className="relative" style={{ aspectRatio: "1 / 1" }}>
        <div
          className={clsx(
            "absolute inset-0 flex items-center justify-center overflow-hidden rounded-full border-2 shadow",
            dimmed && "opacity-50",
          )}
          style={{ borderColor: token.color, backgroundColor: token.imageUrl ? "#0000" : token.color }}
        >
          {token.imageUrl ? (
            <img src={token.imageUrl} alt="" draggable={false} className="h-full w-full object-cover" />
          ) : (
            <span className="select-none text-[8px] font-bold leading-none text-black/80">
              {initialsOf(token.label)}
            </span>
          )}
        </div>
        {hiddenFromPlayers && (
          <span
            className="absolute -right-1 -top-1 rounded-full bg-ink-950/80 px-0.5 text-[8px] leading-none"
            title="Hidden from players"
          >
            🚫
          </span>
        )}
      </div>
      {token.hpMax !== null && token.hpMax > 0 && (
        <div className="mx-auto mt-0.5 w-[120%] -translate-x-[8%]">
          <HpBar hp={token.hp} hpMax={token.hpMax} />
        </div>
      )}
      {token.label && (
        <div className="mt-0.5 whitespace-nowrap text-center text-[8px] leading-tight text-ink-50 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
          {token.label}
        </div>
      )}
    </div>
  );
}

/**
 * A repeating square grid overlay drawn with an SVG pattern, in normalized space
 * (cell size/offset as fractions). `viewW`/`viewH` are the rendered pixel size of
 * the map so the pattern can be expressed in those units.
 */
export function GridOverlay({ grid, viewW, viewH }: { grid: MapGrid; viewW: number; viewH: number }) {
  if (!grid.visible || grid.size <= 0 || viewW <= 0 || viewH <= 0) return null;
  const cell = grid.size * viewW;
  const ox = grid.offsetX * viewW;
  const oy = grid.offsetY * viewW;
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1]"
      width={viewW}
      height={viewH}
      aria-hidden
    >
      <defs>
        <pattern id="map-grid" width={cell} height={cell} patternUnits="userSpaceOnUse" x={ox} y={oy}>
          <path d={`M ${cell} 0 L 0 0 0 ${cell}`} fill="none" stroke={grid.color} strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={viewW} height={viewH} fill="url(#map-grid)" />
    </svg>
  );
}
