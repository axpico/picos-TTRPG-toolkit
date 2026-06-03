import type { DiceRoll as DiceRollDto } from "@toolkit/shared";
import type { DiceRoll as DbDiceRoll } from "@prisma/client";
import type { Role } from "@toolkit/shared";

export type Roller = { displayName: string | null; username: string } | null;

export function toDiceDto(r: DbDiceRoll, roller: Roller): DiceRollDto {
  return {
    id: r.id,
    campaignId: r.campaignId,
    userId: r.userId,
    rollerName: roller ? roller.displayName ?? roller.username : null,
    notation: r.notation,
    result: r.result,
    breakdownJson: r.breakdownJson,
    label: r.label,
    hidden: r.hidden,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * Restrict a roll list to what `role` is allowed to see. The DM sees every
 * roll; everyone else (players) never sees rolls the DM marked hidden.
 */
export function visibleRolls<T extends { hidden: boolean }>(rolls: T[], role: Role | undefined): T[] {
  if (role === "dm") return rolls;
  return rolls.filter((r) => !r.hidden);
}
