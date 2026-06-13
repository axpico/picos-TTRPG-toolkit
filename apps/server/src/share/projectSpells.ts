import type { Spell } from "@toolkit/shared";

/**
 * Player-safe view of a spell. Spells are public rules content, so the reveal
 * keeps the full stat block; only GM-private fields (tags, slug, campaignId)
 * are dropped. Pure and prisma-free so the projection logic is unit-testable.
 */
export type SpellShare = Pick<
  Spell,
  | "id"
  | "name"
  | "level"
  | "school"
  | "castingTime"
  | "range"
  | "components"
  | "duration"
  | "description"
  | "higherLevels"
  | "classes"
  | "ritual"
  | "concentration"
  | "source"
>;

function toSpellShare(s: Spell): SpellShare {
  return {
    id: s.id,
    name: s.name,
    level: s.level,
    school: s.school,
    castingTime: s.castingTime,
    range: s.range,
    components: s.components,
    duration: s.duration,
    description: s.description,
    higherLevels: s.higherLevels,
    classes: s.classes,
    ritual: s.ritual,
    concentration: s.concentration,
    source: s.source,
  };
}

/**
 * Read the pinned spell ids from a broadcast payload. Accepts the multi-pin
 * `spellIds` array and falls back to the legacy single `spellId` so broadcasts
 * created before multi-pin still project.
 */
export function pinnedSpellIds(payload: Record<string, unknown>): string[] {
  const arr = payload.spellIds;
  if (Array.isArray(arr)) {
    return arr.filter((x): x is string => typeof x === "string" && x.length > 0);
  }
  const single = payload.spellId;
  return typeof single === "string" && single ? [single] : [];
}

/**
 * Project the fetched spells to the player-safe array, preserving the pinned
 * order and dropping any row that belongs to a different campaign (library
 * spells have `campaignId === null` and are always allowed). Returns `null` when
 * nothing is left to show, matching the share-engine "omit this entry" contract.
 */
export function projectPinnedSpells(
  spells: readonly Spell[],
  campaignId: string,
  ids: readonly string[],
): SpellShare[] | null {
  const byId = new Map(spells.map((s) => [s.id, s]));
  const out: SpellShare[] = [];
  for (const id of ids) {
    const spell = byId.get(id);
    if (!spell) continue;
    if (spell.campaignId && spell.campaignId !== campaignId) continue;
    out.push(toSpellShare(spell));
  }
  return out.length ? out : null;
}
