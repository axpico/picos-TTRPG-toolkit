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
 * A square grid overlay drawn in normalized image space (viewBox 0..1, stretched
 * to the map with `preserveAspectRatio="none"`), so it scales 1:1 with the image
 * at any zoom — exactly like the fog mask. `aspect = imageWidth/imageHeight`
 * keeps cells pixel-square on non-square maps; lines use a non-scaling stroke so
 * they stay crisp at any zoom.
 */
export function GridOverlay({ grid, aspect }: { grid: MapGrid; aspect: number }) {
  if (!grid.visible || grid.size <= 0) return null;
  const a = aspect > 0 ? aspect : 1;
  const size = grid.size; // cell width as a fraction of width
  const ySize = size * a; // same pixel size expressed as a fraction of height

  const xs: number[] = [];
  for (let x = grid.offsetX % size; x <= 1.0001; x += size) xs.push(x);
  const ys: number[] = [];
  for (let y = (grid.offsetY % size) * a; y <= 1.0001; y += ySize) ys.push(y);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
    >
      {xs.map((x) => (
        <line key={`x${x}`} x1={x} y1={0} x2={x} y2={1} stroke={grid.color} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {ys.map((y) => (
        <line key={`y${y}`} x1={0} y1={y} x2={1} y2={y} stroke={grid.color} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
