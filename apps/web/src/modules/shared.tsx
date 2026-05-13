import { useState } from "react";
import clsx from "clsx";

export function HpBar({ hp, hpMax }: { hp: number | null; hpMax: number | null }) {
  if (!hpMax || hpMax <= 0) return null;
  const pct = Math.max(0, Math.min(100, ((hp ?? 0) / hpMax) * 100));
  const color = pct > 60 ? "bg-emerald-500" : pct > 30 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-ink-700">
      <div
        className={clsx("h-full rounded-full transition-all duration-300", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function InlineConfirm({
  onConfirm,
  title = "Delete",
}: {
  onConfirm: () => void;
  title?: string;
}) {
  const [ask, setAsk] = useState(false);
  if (ask)
    return (
      <span className="flex items-center gap-1">
        <button className="btn-danger h-6 px-1.5 text-xs" onClick={onConfirm}>
          Yes
        </button>
        <button className="btn-ghost h-6 px-1.5 text-xs" onClick={() => setAsk(false)}>
          No
        </button>
      </span>
    );
  return (
    <button
      className="btn-ghost px-2 text-ink-500 hover:text-red-400"
      title={title}
      onClick={() => setAsk(true)}
    >
      ×
    </button>
  );
}
