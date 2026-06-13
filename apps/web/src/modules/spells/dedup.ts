import type { Spell } from "@toolkit/shared";

/**
 * Pure duplicate check for the "copy spell between scopes" action. A spell is a
 * duplicate when the target scope already holds one with the same non-null
 * `slug` (imported spells) or the same name, case-insensitively (custom spells).
 * Kept React-free so it can be unit-tested directly.
 *
 * `targetCampaignId` is the scope being copied *into*: a campaign id, or
 * `null`/`undefined` for the shared global library.
 */
export function findDuplicate(
  spells: readonly Spell[],
  name: string,
  slug: string | null,
  targetCampaignId: string | null | undefined,
): Spell | undefined {
  const target = targetCampaignId ?? null;
  const wantName = name.trim().toLowerCase();
  return spells.find((s) => {
    if ((s.campaignId ?? null) !== target) return false;
    if (slug && s.slug === slug) return true;
    return s.name.trim().toLowerCase() === wantName;
  });
}
