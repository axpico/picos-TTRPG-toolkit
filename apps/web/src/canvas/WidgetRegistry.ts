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

/**
 * How a widget participates in live share:
 *  - "model"  → a server projector fetches player-safe data for a fixed key.
 *  - "state"  → the widget's own canvas state is the shared payload (no backend
 *               model; the GM pushes state into the broadcast payload).
 *  - "native" → the widget has a bespoke player-view panel wired directly into
 *               PlayerState.data (the original first-class widgets). It is still
 *               live, just not routed through the generic renderer registry.
 */
export type ShareMode = "model" | "state" | "native";

export interface WidgetDefinition {
  type: string;
  title: string;
  /** Suggested initial size when the widget is first added. */
  defaultSize: { w: number; h: number };
  /**
   * Optional fixed broadcast key (e.g. "party"). When omitted, the widget falls
   * back to a per-instance key `${type}:${instanceId}`. Every widget is now
   * live-shareable; `share` selects how its data reaches the player view.
   */
  broadcastKey?: string;
  /** How this widget projects to players. Defaults to "model" when omitted. */
  share?: ShareMode;
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
