import { z } from "zod";

export const layoutItem = z.object({
  instanceId: z.string().min(1),
  moduleType: z.string().min(1),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  state: z.record(z.unknown()).optional(),
});
export type LayoutItem = z.infer<typeof layoutItem>;

export const viewport = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number().positive(),
});
export type Viewport = z.infer<typeof viewport>;

export const layout = z.object({
  items: z.array(layoutItem),
  viewport: viewport,
});
export type Layout = z.infer<typeof layout>;

export const defaultLayout: Layout = {
  items: [],
  viewport: { x: 0, y: 0, scale: 1 },
};
