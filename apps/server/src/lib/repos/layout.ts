import { defaultLayout, layout as layoutSchema, type Layout } from "@toolkit/shared";
import type { Layout as DbLayout } from "@prisma/client";
import { parseJsonField } from "../json.js";
import { z } from "zod";

const itemsSchema = layoutSchema.shape.items;

export function toLayoutDto(row: DbLayout | null): Layout {
  if (!row) return defaultLayout;
  const items = parseJsonField(row.itemsJson, itemsSchema, []);
  return {
    items,
    viewport: { x: row.viewportX, y: row.viewportY, scale: row.viewportScale },
  };
}

export const layoutInputSchema = layoutSchema;
export type LayoutInput = z.infer<typeof layoutInputSchema>;
