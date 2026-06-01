import type { ComponentType } from "react";

export interface WidgetContext {
  campaignId: string;
  instanceId: string;
  state: Record<string, unknown> | undefined;
  setState: (patch: Record<string, unknown>) => void;
  /**
   * Stable key used by the Broadcast model. Widgets that participate in
   * broadcasting use this to coordinate per-widget projection state with the
   * server.
   */
  broadcastKey?: string;
}

export interface WidgetDefinition {
  type: string;
  title: string;
  /** Suggested initial size when the widget is first added. */
  defaultSize: { w: number; h: number };
  /** Optional fixed broadcast key (e.g. "party"). When omitted, the module is GM-only. */
  broadcastKey?: string;
  /** Optional short glyph/emoji shown in the widget palette (falls back to a monogram). */
  icon?: string;
  Component: ComponentType<WidgetContext>;
}

const registry = new Map<string, WidgetDefinition>();

export function registerWidget(def: WidgetDefinition) {
  registry.set(def.type, def);
}

export function getWidget(type: string): WidgetDefinition | undefined {
  return registry.get(type);
}

export function listWidgets(): WidgetDefinition[] {
  return Array.from(registry.values()).sort((a, b) => a.title.localeCompare(b.title));
}
