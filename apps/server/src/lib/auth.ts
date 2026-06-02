import type { Role } from "@toolkit/shared";

export function isDm(role: Role | null | undefined): boolean {
  return role === "dm";
}

/**
 * Whether a user may edit a given party member as their "own character".
 * DMs can manage any member; players only the member assigned to them.
 */
export function canManageCharacter(
  userId: string,
  role: Role | null | undefined,
  member: { userId: string | null },
): boolean {
  if (isDm(role)) return true;
  return member.userId !== null && member.userId === userId;
}
