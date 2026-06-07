import { z } from "zod";

/**
 * widgetKey is the stable identifier the GM widget controls. By convention:
 *   `${moduleType}:${instanceId}` for canvas widgets that broadcast their own state.
 * For singleton broadcast targets (e.g. "the current map"), the module may use a
 * fixed key like `map:current`.
 */
export const broadcast = z.object({
  campaignId: z.string(),
  widgetKey: z.string().min(1).max(120),
  active: z.boolean(),
  payload: z.record(z.unknown()),
  updatedAt: z.string(),
});
export type Broadcast = z.infer<typeof broadcast>;

export const setBroadcastInput = z.object({
  active: z.boolean(),
  payload: z.record(z.unknown()).optional(),
});
export type SetBroadcastInput = z.infer<typeof setBroadcastInput>;

/**
 * A generic projection entry produced by the share engine: any widget the GM is
 * broadcasting that has a registered server projector + client renderer. The
 * existing first-class widgets (party, combat, map, …) keep their dedicated
 * `PlayerState.data` fields; everything else flows through `widgets`.
 */
export const shareEntry = z.object({
  /** The broadcast key, e.g. "npc" or "sticky:<instanceId>". */
  widgetKey: z.string(),
  /** The widget module type (key prefix), e.g. "npc". */
  type: z.string(),
  /** Player-safe payload produced by the server projector. */
  data: z.unknown(),
});
export type ShareEntry = z.infer<typeof shareEntry>;

/** Batch broadcast toggle — used by the GM "Share all / Hide all" control. */
export const setBroadcastsInput = z.object({
  active: z.boolean(),
  widgetKeys: z.array(z.string().min(1).max(120)).max(200),
});
export type SetBroadcastsInput = z.infer<typeof setBroadcastsInput>;
