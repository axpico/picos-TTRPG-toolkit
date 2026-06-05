import { useEffect, useState } from "react";
import clsx from "clsx";
import type { ProgressClock, UpdateClockInput } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { InlineConfirm } from "../shared.js";
import { useClocks, useCreateClock, useDeleteClock, useUpdateClock } from "./api.js";

const SEGMENT_OPTIONS = [4, 6, 8, 10, 12] as const;

const COLORS = [
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#10b981", // emerald
  "#f59e0b", // amber
  "#0ea5e9", // sky
  "#8b5cf6", // violet
] as const;

function polarXY(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function ClockFace({
  segments,
  filled,
  color,
  onToggle,
}: {
  segments: number;
  filled: number;
  color: string;
  onToggle: (i: number) => void;
}) {
  const cx = 50, cy = 50, r = 44;
  const TAU = Math.PI * 2;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full select-none">
      {Array.from({ length: segments }, (_, i) => {
        const a1 = (i / segments) * TAU - Math.PI / 2;
        const a2 = ((i + 1) / segments) * TAU - Math.PI / 2;
        const [x1, y1] = polarXY(cx, cy, r, a1);
        const [x2, y2] = polarXY(cx, cy, r, a2);
        const largeArc = a2 - a1 > Math.PI ? 1 : 0;
        const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
        return (
          <path
            key={i}
            d={d}
            fill={i < filled ? color : "#1e293b"}
            stroke="#0f172a"
            strokeWidth="2"
            style={{ cursor: "pointer", transition: "opacity 0.1s" }}
            onClick={() => onToggle(i)}
            onMouseEnter={(e) => ((e.target as SVGPathElement).style.opacity = "0.8")}
            onMouseLeave={(e) => ((e.target as SVGPathElement).style.opacity = "1")}
          />
        );
      })}
    </svg>
  );
}

function ClocksWidget({ campaignId }: WidgetContext) {
  const list = useClocks(campaignId);
  const create = useCreateClock(campaignId);
  const update = useUpdateClock(campaignId);
  const remove = useDeleteClock(campaignId);
  const [newName, setNewName] = useState("");
  const [newSegments, setNewSegments] = useState<number>(6);

  const doCreate = () => {
    const name = newName.trim();
    if (!name) return;
    create.mutate({ name, segments: newSegments }, { onSuccess: () => setNewName("") });
  };

  const clocks = list.data ?? [];
  const moveClock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= clocks.length) return;
    const a = clocks[index];
    const b = clocks[target];
    if (!a || !b) return;
    update.mutate({ id: a.id, input: { order: b.order } });
    update.mutate({ id: b.id, input: { order: a.order } });
  };

  return (
    <div className="flex h-full flex-col">
      {/* New clock bar */}
      <div className="flex items-center gap-1 border-b border-ink-700 px-2 py-1.5">
        <input
          className="input flex-1"
          placeholder="New clock name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doCreate()}
        />
        <div className="flex gap-0.5">
          {SEGMENT_OPTIONS.map((n) => (
            <button
              key={n}
              className={clsx(
                "h-7 w-7 rounded text-xs font-mono",
                newSegments === n ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => setNewSegments(n)}
              title={`${n} segments`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          className="btn-primary px-2"
          disabled={!newName.trim() || create.isPending}
          onClick={doCreate}
        >
          +
        </button>
      </div>

      {/* Clock grid */}
      <div className="flex-1 overflow-auto p-2">
        {clocks.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {clocks.map((clock, idx) => (
              <ClockCard
                key={clock.id}
                clock={clock}
                onChange={(input) => update.mutate({ id: clock.id, input })}
                onDelete={() => remove.mutate(clock.id)}
                onMove={(dir) => moveClock(idx, dir)}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-ink-400">
            No clocks yet.
            <br />
            Create one to track threats, progress, or countdowns.
          </div>
        )}
      </div>
    </div>
  );
}

interface ClockCardProps {
  clock: ProgressClock;
  onChange: (input: UpdateClockInput) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

function ClockCard({ clock, onChange, onDelete, onMove }: ClockCardProps) {
  const [localName, setLocalName] = useState(clock.name);
  const [localDesc, setLocalDesc] = useState(clock.description ?? "");

  useEffect(() => setLocalName(clock.name), [clock.name]);
  useEffect(() => setLocalDesc(clock.description ?? ""), [clock.description]);

  const handleSegmentClick = (i: number) => {
    // Click filled segment → retreat to i; click empty → advance to i+1
    const next = i < clock.filled ? i : i + 1;
    onChange({ filled: Math.max(0, Math.min(next, clock.segments)) });
  };

  const isFull = clock.filled >= clock.segments;

  return (
    <div
      className={clsx(
        "flex flex-col gap-1.5 rounded-md border p-2 text-sm",
        clock.secret
          ? "border-amber-500/40 bg-amber-500/5"
          : isFull
            ? "border-red-500/50 bg-red-900/10"
            : "border-ink-700 bg-ink-900",
      )}
    >
      {/* Name row */}
      <div className="flex items-center gap-1">
        <div className="flex shrink-0 flex-col">
          <button
            className="h-3 leading-none text-[10px] text-ink-400 hover:text-ink-200"
            onClick={() => onMove(-1)}
            title="Move up"
            aria-label="Move clock up"
          >
            ▲
          </button>
          <button
            className="h-3 leading-none text-[10px] text-ink-400 hover:text-ink-200"
            onClick={() => onMove(1)}
            title="Move down"
            aria-label="Move clock down"
          >
            ▼
          </button>
        </div>
        <input
          className="input flex-1 text-sm font-medium"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => localName !== clock.name && onChange({ name: localName })}
        />
        <button
          className={clsx(
            "btn-ghost h-6 px-1 text-xs",
            clock.secret ? "text-amber-400" : "text-ink-400 hover:text-ink-200",
          )}
          onClick={() => onChange({ secret: !clock.secret })}
          title={clock.secret ? "Secret — hidden from players" : "Visible to players when broadcast"}
          aria-label={clock.secret ? "Make clock visible to players" : "Hide clock from players"}
          aria-pressed={clock.secret}
        >
          {clock.secret ? "🔒" : "🔓"}
        </button>
        <InlineConfirm onConfirm={onDelete} title="Delete clock" />
      </div>

      {/* SVG clock face with centered progress label */}
      <div className="relative aspect-square w-full">
        <ClockFace
          segments={clock.segments}
          filled={clock.filled}
          color={clock.color}
          onToggle={handleSegmentClick}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className={clsx(
              "font-mono text-sm font-bold",
              isFull ? "text-red-400" : "text-ink-300",
            )}
          >
            {clock.filled}/{clock.segments}
          </span>
        </div>
      </div>

      {/* +/− tick buttons + reset */}
      <div className="flex gap-1">
        <button
          className="btn-ghost h-6 flex-1 text-xs"
          onClick={() => onChange({ filled: Math.max(0, clock.filled - 1) })}
          disabled={clock.filled === 0}
        >
          − tick
        </button>
        <button
          className="btn-ghost h-6 flex-1 text-xs"
          onClick={() => onChange({ filled: Math.min(clock.segments, clock.filled + 1) })}
          disabled={isFull}
        >
          + tick
        </button>
        <button
          className="btn-ghost h-6 px-2 text-xs text-ink-400"
          onClick={() => onChange({ filled: 0 })}
          disabled={clock.filled === 0}
          title="Reset"
        >
          ↺
        </button>
      </div>

      {/* Color swatches + segment size */}
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            className={clsx(
              "h-3.5 w-3.5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
              clock.color === c ? "border-ink-100 scale-110" : "border-transparent",
            )}
            style={{ backgroundColor: c }}
            onClick={() => onChange({ color: c })}
            aria-label={`Set clock color`}
            aria-pressed={clock.color === c}
          />
        ))}
        <div className="ml-auto flex gap-0.5">
          {SEGMENT_OPTIONS.map((n) => (
            <button
              key={n}
              className={clsx(
                "h-5 w-5 rounded text-[10px] font-mono",
                clock.segments === n
                  ? "bg-ink-600 text-ink-100"
                  : "text-ink-400 hover:text-ink-300",
              )}
              onClick={() =>
                onChange({ segments: n, filled: Math.min(clock.filled, n) })
              }
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <input
        className="input text-xs text-ink-400"
        placeholder="What does this clock track?"
        value={localDesc}
        onChange={(e) => setLocalDesc(e.target.value)}
        onBlur={() => {
          const v = localDesc || undefined;
          if (v !== (clock.description ?? undefined)) onChange({ description: v ?? null });
        }}
      />
    </div>
  );
}

registerWidget({
  type: "clocks",
  title: "Progress Clocks",
  defaultSize: { w: 480, h: 480 },
  broadcastKey: "clocks",
  Component: ClocksWidget,
});

export {};
