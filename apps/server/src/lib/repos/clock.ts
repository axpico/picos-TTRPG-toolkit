import type { ProgressClock as ClockDto } from "@toolkit/shared";
import type { ProgressClock as DbClock } from "@prisma/client";

export function toClockDto(row: DbClock): ClockDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    segments: row.segments,
    filled: row.filled,
    description: row.description,
    color: row.color,
    order: row.order,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
