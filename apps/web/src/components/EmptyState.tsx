import type { ReactNode } from "react";
import clsx from "clsx";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Tighter spacing for use inside widget cards. */
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-700 bg-ink-900/40 text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
      )}
    >
      {icon && <div className={clsx("opacity-80", compact ? "mb-2 text-2xl" : "mb-3 text-3xl")}>{icon}</div>}
      <h3 className={clsx("display font-medium text-ink-100", compact ? "text-sm" : "text-lg")}>{title}</h3>
      {description && (
        <p className={clsx("mt-1 max-w-sm text-ink-400", compact ? "text-xs" : "text-sm")}>{description}</p>
      )}
      {action && <div className={compact ? "mt-3" : "mt-4"}>{action}</div>}
    </div>
  );
}
