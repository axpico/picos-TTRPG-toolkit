import { useCallback, useMemo } from "react";
import type { WidgetContext } from "./WidgetRegistry.js";

/**
 * Typed view over a widget's persisted canvas `state`. Each widget declares its
 * state shape and defaults once, instead of re-casting `state?.foo as Foo` at
 * every read site. The returned `patch` writes a partial back through the
 * standard `setState` so the layout stays the single source of truth.
 *
 * Persisted values are trusted to match `T` (same assumption the previous
 * ad-hoc casts made); `defaults` only fill keys that are absent.
 */
export function useWidgetState<T extends Record<string, unknown>>(
  ctx: Pick<WidgetContext, "state" | "setState">,
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const { state, setState } = ctx;
  const value = useMemo(
    () => ({ ...defaults, ...(state ?? {}) }) as T,
    // `defaults` is expected to be a stable literal per widget render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );
  const patch = useCallback(
    (p: Partial<T>) => setState(p as Record<string, unknown>),
    [setState],
  );
  return [value, patch];
}
