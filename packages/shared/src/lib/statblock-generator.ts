import {
  abilityMod,
  emptyStatBlock,
  type AbilityKey,
  type StatBlock,
} from "../schemas/statblock.js";
import { signedMod } from "./statblock-roll.js";

/**
 * A deterministic, DMG-style statblock builder. Given a target CR (or level) and
 * an archetype it produces a plausible, internally-consistent {@link StatBlock}
 * — AC, HP, proficiency bonus, ability scores, saves/skills, and a stock attack
 * whose to-hit and damage match the tier. This is the "math" half of the hybrid
 * generator; flavor (name/quirk/hook) comes from the NPC table generator.
 */

export type Archetype = "brute" | "skirmisher" | "caster" | "leader" | "lurker";
export const ARCHETYPES: Archetype[] = ["brute", "skirmisher", "caster", "leader", "lurker"];

export type SheetKind = "npc" | "beast" | "player";

/** One row of the difficulty tier table, keyed by an integer "challenge index". */
interface Tier {
  profBonus: number;
  ac: number;
  /** Average hit points at this tier. */
  hp: number;
  /** Expected attack bonus / save DC primary modifier at this tier. */
  attackBonus: number;
  /** Hit die size used to roll HP (d6/d8/d10/d12). */
  hitDie: number;
}

// Index 0 = CR 0 / level 1, climbing roughly one step per CR or two levels.
// Values are hand-tuned toward the 5e DMG "Monster Statistics by CR" table.
const TIERS: Tier[] = [
  { profBonus: 2, ac: 12, hp: 9, attackBonus: 3, hitDie: 6 }, // CR 0
  { profBonus: 2, ac: 13, hp: 21, attackBonus: 3, hitDie: 8 }, // CR 1/2–1
  { profBonus: 2, ac: 13, hp: 36, attackBonus: 4, hitDie: 8 }, // CR 2
  { profBonus: 2, ac: 14, hp: 60, attackBonus: 5, hitDie: 10 }, // CR 3
  { profBonus: 2, ac: 14, hp: 85, attackBonus: 5, hitDie: 10 }, // CR 4
  { profBonus: 3, ac: 15, hp: 115, attackBonus: 6, hitDie: 10 }, // CR 5
  { profBonus: 3, ac: 15, hp: 145, attackBonus: 6, hitDie: 12 }, // CR 6
  { profBonus: 3, ac: 16, hp: 175, attackBonus: 7, hitDie: 12 }, // CR 7
  { profBonus: 3, ac: 16, hp: 200, attackBonus: 7, hitDie: 12 }, // CR 8
  { profBonus: 4, ac: 17, hp: 230, attackBonus: 8, hitDie: 12 }, // CR 9
  { profBonus: 4, ac: 17, hp: 260, attackBonus: 8, hitDie: 12 }, // CR 10
  { profBonus: 4, ac: 18, hp: 295, attackBonus: 9, hitDie: 20 }, // CR 11–12
  { profBonus: 5, ac: 18, hp: 340, attackBonus: 10, hitDie: 20 }, // CR 13–14
  { profBonus: 5, ac: 19, hp: 400, attackBonus: 11, hitDie: 20 }, // CR 15–16
  { profBonus: 6, ac: 19, hp: 460, attackBonus: 12, hitDie: 20 }, // CR 17–18
  { profBonus: 6, ac: 20, hp: 540, attackBonus: 13, hitDie: 20 }, // CR 19–20
];

const ABILITY_ORDER: Record<Archetype, AbilityKey[]> = {
  // primary → … → dump, used to spread a fixed score spread across abilities.
  brute: ["str", "con", "dex", "wis", "cha", "int"],
  skirmisher: ["dex", "con", "wis", "str", "cha", "int"],
  caster: ["int", "con", "dex", "wis", "cha", "str"],
  leader: ["cha", "con", "wis", "dex", "int", "str"],
  lurker: ["dex", "wis", "con", "int", "cha", "str"],
};

const ATTACK_NAME: Record<Archetype, string> = {
  brute: "Heavy Strike",
  skirmisher: "Quick Strike",
  caster: "Eldritch Bolt",
  leader: "Commanding Strike",
  lurker: "Ambush Strike",
};

const DAMAGE_TYPE: Record<Archetype, string> = {
  brute: "bludgeoning",
  skirmisher: "slashing",
  caster: "force",
  leader: "radiant",
  lurker: "piercing",
};

/** Parse a CR string ("1/4", "0.5", "5") or level number into a tier index. */
function tierIndex(crOrLevel: string | number, kind: SheetKind): number {
  let cr: number;
  if (typeof crOrLevel === "number") {
    cr = crOrLevel;
  } else {
    const s = crOrLevel.trim();
    if (s.includes("/")) {
      const [a, b] = s.split("/");
      cr = Number(a) / Number(b || 1);
    } else {
      cr = Number(s);
    }
  }
  if (!Number.isFinite(cr)) cr = 1;
  // Players/NPCs are given as levels; map two levels to one CR-ish step.
  const idx = kind === "player" ? Math.round(cr / 2) : crToIndex(cr);
  return Math.max(0, Math.min(TIERS.length - 1, idx));
}

function crToIndex(cr: number): number {
  if (cr < 1) return cr <= 0 ? 0 : 1;
  if (cr <= 10) return Math.round(cr); // CR 1..10 → index 1..10 (close enough)
  if (cr <= 12) return 11;
  if (cr <= 14) return 12;
  if (cr <= 16) return 13;
  if (cr <= 18) return 14;
  return 15;
}

// A descending spread of ability scores assigned by archetype priority. Higher
// tiers shift the whole spread upward so primaries stay relevant.
function abilitySpread(tier: number): number[] {
  const bump = Math.floor(tier / 4) * 2;
  return [18, 16, 14, 12, 10, 8].map((v) => Math.min(24, v + bump));
}

/** Count of dice for the stock attack, scaling with tier. */
function attackDice(tier: number, hitDie: 4 | 6 | 8 | 10 | 12): { count: number; die: number } {
  const count = 1 + Math.floor(tier / 4);
  return { count, die: hitDie };
}

export interface BuildStatBlockOpts {
  kind: SheetKind;
  /** CR string ("1/2", "5") for npc/beast, or character level for player. */
  crOrLevel: string | number;
  archetype: Archetype;
}

/** Build a fully-defaulted, internally consistent stat block for the tier. */
export function buildStatBlock(opts: BuildStatBlockOpts): StatBlock {
  const { kind, crOrLevel, archetype } = opts;
  const idx = tierIndex(crOrLevel, kind);
  const tier = TIERS[idx]!;
  const base = emptyStatBlock();

  // Ability scores by archetype priority.
  const order = ABILITY_ORDER[archetype];
  const spread = abilitySpread(idx);
  const abilities = { ...base.abilities };
  order.forEach((k, i) => {
    abilities[k] = spread[i]!;
  });

  const primary = order[0]!;
  const primaryMod = abilityMod(abilities[primary]) ?? 0;
  const toHit = tier.profBonus + primaryMod;

  // Stock attack: count d(weaponDie) + primary modifier.
  const weaponDie = archetype === "brute" ? 12 : archetype === "caster" ? 8 : 6;
  const dmg = attackDice(idx, weaponDie as 6 | 8 | 12);
  const dmgMod = primaryMod;
  const dmgNotation = `${dmg.count}d${dmg.die}${dmgMod ? signedMod(dmgMod) : ""}`;
  const avgDmg = Math.floor(dmg.count * (dmg.die / 2 + 0.5)) + dmgMod;
  const attackText =
    `Melee or Ranged Attack: ${signedMod(toHit)} to hit, reach 5 ft. or range 30 ft., one target. ` +
    `Hit: ${Math.max(1, avgDmg)} (${dmgNotation}) ${DAMAGE_TYPE[archetype]} damage.`;

  // Two strongest abilities get saving-throw proficiency.
  const saves = order
    .slice(0, 2)
    .map((k) => `${k.toUpperCase()} ${signedMod((abilityMod(abilities[k]) ?? 0) + tier.profBonus)}`)
    .join(", ");

  const skillByArch: Record<Archetype, string> = {
    brute: "Athletics",
    skirmisher: "Acrobatics",
    caster: "Arcana",
    leader: "Persuasion",
    lurker: "Stealth",
  };
  const skillMod = (abilityMod(abilities[primary]) ?? 0) + tier.profBonus;
  const skills = `${skillByArch[archetype]} ${signedMod(skillMod)}`;

  const speed = archetype === "skirmisher" || archetype === "lurker" ? "40 ft." : "30 ft.";
  const passivePerc = 10 + (abilityMod(abilities.wis) ?? 0);

  const next: StatBlock = {
    ...base,
    abilities,
    ac: tier.ac,
    hp: tier.hp,
    hpMax: tier.hp,
    profBonus: tier.profBonus,
    speed,
    saves,
    skills,
    senses: `passive Perception ${passivePerc}`,
    actions: [
      {
        id: `gen_${Date.now().toString(36)}`,
        name: ATTACK_NAME[archetype],
        desc: attackText,
      },
    ],
  };

  if (kind === "player" || kind === "npc") {
    next.level = typeof crOrLevel === "number" ? crOrLevel : Number(crOrLevel) || null;
    next.cr = null;
  } else {
    next.cr = typeof crOrLevel === "string" ? crOrLevel : String(crOrLevel);
  }

  return next;
}

/** The hit-die size for a CR/level, used by "Roll HP" on the sheet. */
export function hitDieFor(crOrLevel: string | number, kind: SheetKind): number {
  return TIERS[tierIndex(crOrLevel, kind)]!.hitDie;
}

/** A short human label for a generated tier, e.g. "CR 5 · brute". */
export function describeBuild(opts: BuildStatBlockOpts): string {
  const label = opts.kind === "player" ? `Level ${opts.crOrLevel}` : `CR ${opts.crOrLevel}`;
  return `${label} · ${opts.archetype}`;
}
