import type { WidgetDefinition } from "./WidgetRegistry.js";

/**
 * Case-insensitive title filter for the widget palette. Preserves the input
 * order (already title-sorted by `listWidgets`) and returns everything when the
 * query is blank.
 */
export function filterWidgets(list: WidgetDefinition[], query: string): WidgetDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((w) => w.title.toLowerCase().includes(q));
}
