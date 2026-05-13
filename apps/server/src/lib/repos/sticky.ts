import type { StickyNote as StickyDto } from "@toolkit/shared";
import type { StickyNote as DbSticky } from "@prisma/client";

export function toStickyDto(row: DbSticky): StickyDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    text: row.text,
    color: row.color,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
