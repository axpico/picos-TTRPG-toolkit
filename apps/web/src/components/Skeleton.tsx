import clsx from "clsx";

/** A pulsing placeholder block. Pass sizing via className. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-md bg-ink-800/80", className)} />;
}
