import { useState, type ReactNode } from "react";
import clsx from "clsx";

/** Semantic status badge. Wraps the `.badge-*` utilities so every widget shows
 *  statuses (alive/down/running/secret…) with one consistent style. */
export type BadgeTone = "ok" | "warn" | "danger" | "info" | "muted" | "accent";

const TONE_CLASS: Record<BadgeTone, string> = {
  ok: "badge-ok",
  warn: "badge-warn",
  danger: "badge-danger",
  info: "badge-info",
  muted: "badge-muted",
  accent: "badge-accent",
};

export function StatusBadge({
  tone = "muted",
  children,
  title,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span title={title} className={clsx(TONE_CLASS[tone], className)}>
      {children}
    </span>
  );
}

/** Standard widget header bar: a left title/content area and optional actions on
 *  the right. Gives every widget the same header height, padding and divider. */
export function SectionHead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("section-head", className)}>{children}</div>;
}

/**
 * Segmented two-option toggle used by the library widgets (Bestiary, NPCs) to
 * switch between the current campaign and the shared "all" view. Replaces a
 * plain <select> with a clearer, more tactile control.
 */
export function ScopeToggle({
  value,
  onChange,
  className,
}: {
  value: "campaign" | "all";
  onChange: (v: "campaign" | "all") => void;
  className?: string;
}) {
  const opts = [
    { v: "campaign", label: "This campaign" },
    { v: "all", label: "All" },
  ] as const;
  return (
    <div
      role="tablist"
      className={clsx(
        "inline-flex shrink-0 rounded-md border border-ink-700 bg-ink-900 p-0.5",
        className,
      )}
    >
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="tab"
          aria-selected={value === o.v}
          onClick={() => onChange(o.v)}
          className={clsx(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.v
              ? "bg-accent-600 text-accent-fg shadow-sm"
              : "text-ink-400 hover:text-ink-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Search box with a leading icon and a clear (×) button when non-empty. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={clsx("relative flex-1", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
      >
        🔍
      </span>
      <input
        type="search"
        aria-label={placeholder}
        className="input pl-8"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1 text-ink-400 transition-colors hover:text-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          title="Clear search"
          onClick={() => onChange("")}
        >
          ×
        </button>
      )}
    </div>
  );
}

/** Compact read-only metadata pill (e.g. a creature's type or CR). */
export function MetaChip({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={clsx(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
        "bg-ink-800 text-ink-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function HpBar({ hp, hpMax }: { hp: number | null; hpMax: number | null }) {
  if (!hpMax || hpMax <= 0) return null;
  const pct = Math.max(0, Math.min(100, ((hp ?? 0) / hpMax) * 100));
  const color = pct > 60 ? "bg-emerald-500" : pct > 30 ? "bg-amber-500" : "bg-red-500";
  return (
    <div
      role="progressbar"
      aria-valuenow={hp ?? 0}
      aria-valuemin={0}
      aria-valuemax={hpMax}
      aria-label="Hit points"
      className="h-1 w-full overflow-hidden rounded-full bg-ink-700"
    >
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
        <button
          type="button"
          aria-label={`Confirm: ${title}`}
          className="btn-danger h-6 px-1.5 text-xs"
          onClick={onConfirm}
        >
          Yes
        </button>
        <button
          type="button"
          aria-label="Cancel"
          className="btn-ghost h-6 px-1.5 text-xs"
          onClick={() => setAsk(false)}
        >
          No
        </button>
      </span>
    );
  return (
    <button
      type="button"
      aria-label={title}
      className="btn-ghost px-2 text-ink-400 hover:text-red-400"
      title={title}
      onClick={() => setAsk(true)}
    >
      ×
    </button>
  );
}
