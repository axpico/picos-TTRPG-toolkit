import type { Timer as TimerDto } from "@toolkit/shared";
import type { Timer as DbTimer } from "@prisma/client";

export function toTimerDto(row: DbTimer): TimerDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    durationSeconds: row.durationSeconds,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    remainingSeconds: row.remainingSeconds,
    color: row.color,
    secret: row.secret,
    order: row.order,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
