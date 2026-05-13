import { z } from "zod";

/**
 * SSE events fanned out by the server. The GM stream receives all events; the
 * player stream receives only events whose `broadcastKey` is currently active.
 *
 * `broadcastKey` is optional. When present, the event is gated by the per-widget
 * Broadcast record. When absent, the event is GM-only.
 */
export const sseEvent = z.object({
  type: z.string(),
  campaignId: z.string(),
  broadcastKey: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});
export type SSEEvent = z.infer<typeof sseEvent>;
