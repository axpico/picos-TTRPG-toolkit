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
