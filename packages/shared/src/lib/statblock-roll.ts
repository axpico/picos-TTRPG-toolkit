import { ABILITY_KEYS, abilityMod, type AbilityKey, type StatBlock } from "../schemas/statblock.js";

/**
 * Pure helpers that turn the free-text fields of a {@link StatBlock} into
 * rollable dice notation. No React, no I/O — just parsing and string building so
 * both the web client and the server can share the logic.
 */

/** Format a number as a signed modifier suffix, e.g. 3 → "+3", -1 → "-1", 0 → "+0". */
export function signedMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Append a modifier to a base notation, omitting it when the modifier is 0. */
function withMod(base: string, mod: number): string {
  return mod === 0 ? base : `${base}${signedMod(mod)}`;
}

export const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

/** Map common ability abbreviations/names back to a canonical key. */
const ABILITY_LOOKUP: Record<string, AbilityKey> = (() => {
  const out: Record<string, AbilityKey> = {};
  for (const k of ABILITY_KEYS) {
    out[k] = k;
    out[ABILITY_NAMES[k].toLowerCase()] = k;
  }
  return out;
})();

export type ParsedModifier = { name: string; mod: number; ability?: AbilityKey };

/**
 * Parse a comma/semicolon separated modifier list like the `saves` or `skills`
 * fields — e.g. `"DEX +5, CON +3"` or `"Perception +4, Stealth +6"` — into a
 * list of rollable entries. Tolerant of extra whitespace and missing signs.
 */
export function parseModifierList(text: string | null | undefined): ParsedModifier[] {
  if (!text) return [];
  const out: ParsedModifier[] = [];
  for (const raw of text.split(/[,;]/)) {
    const part = raw.trim();
    if (!part) continue;
    // "<name> <+/-N>" — capture trailing signed number as the modifier.
    const m = part.match(/^(.+?)\s*([+-]\s*\d+)\s*$/);
    if (!m) continue;
    const name = m[1]!.trim();
    const mod = Number(m[2]!.replace(/\s+/g, ""));
    if (!Number.isFinite(mod)) continue;
    const ability = ABILITY_LOOKUP[name.toLowerCase()];
    out.push({ name, mod, ...(ability ? { ability } : {}) });
  }
  return out;
}

export type ParsedDamage = { notation: string; type?: string };
export type ParsedAction = { toHit?: number; damage: ParsedDamage[] };

/**
 * Parse a D&D-style action description for an attack bonus and damage dice.
 * Examples it understands:
 *   "+5 to hit ... Hit: 7 (1d8 + 3) slashing damage plus 3 (1d6) fire damage"
 * Returns `toHit` (the d20 attack modifier) and any damage dice expressions with
 * their damage type. Anything it can't find is simply omitted.
 */
export function parseAction(desc: string | null | undefined): ParsedAction {
  const out: ParsedAction = { damage: [] };
  if (!desc) return out;

  const hit = desc.match(/([+-]\s*\d+)\s*to\s*hit/i);
  if (hit) {
    const n = Number(hit[1]!.replace(/\s+/g, ""));
    if (Number.isFinite(n)) out.toHit = n;
  }

  // Match "(1d8 + 3)" or "(2d6)" optionally followed by a damage type word.
  const dmgRe = /\(\s*(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*\)(?:\s*([a-z]+)\s*damage)?/gi;
  let m: RegExpExecArray | null;
  while ((m = dmgRe.exec(desc))) {
    const notation = m[1]!.replace(/\s+/g, "");
    const type = m[2]?.toLowerCase();
    out.damage.push(type ? { notation, type } : { notation });
  }
  return out;
}

/**
 * Build a d20 ability-check notation from a score. When `proficient` is set and
 * a proficiency bonus is known, it is added on top of the ability modifier.
 */
export function abilityCheckNotation(
  score: number | null | undefined,
  profBonus?: number | null,
  opts?: { proficient?: boolean },
): string {
  let mod = abilityMod(score) ?? 0;
  if (opts?.proficient && profBonus != null) mod += profBonus;
  return withMod("1d20", mod);
}

/** Initiative is a Dexterity check: 1d20 + DEX modifier. */
export function initiativeNotation(stats: Pick<StatBlock, "abilities">): string {
  const mod = abilityMod(stats.abilities.dex) ?? 0;
  return withMod("1d20", mod);
}
