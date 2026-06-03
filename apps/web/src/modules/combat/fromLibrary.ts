import type { CreateCombatantInput, Monster, NPC, PartyMember } from "@toolkit/shared";

/**
 * Map an existing party member / NPC / bestiary creature into the input for a
 * new combatant, carrying over HP, max HP and AC from its stat block. Initiative
 * defaults to 0 (roll or edit it once added). Party members are flagged as PCs.
 */

export function combatantFromParty(m: PartyMember): CreateCombatantInput {
  return {
    name: m.name,
    initiative: 0,
    hp: m.hp,
    hpMax: m.hpMax,
    ...(m.stats.ac != null ? { ac: m.stats.ac } : {}),
    isPC: true,
  };
}

function fromStatted(name: string, stats: NPC["stats"]): CreateCombatantInput {
  const hp = stats.hp ?? stats.hpMax ?? undefined;
  const hpMax = stats.hpMax ?? hp ?? undefined;
  return {
    name,
    initiative: 0,
    ...(hp != null ? { hp } : {}),
    ...(hpMax != null ? { hpMax } : {}),
    ...(stats.ac != null ? { ac: stats.ac } : {}),
    isPC: false,
  };
}

export function combatantFromNpc(n: NPC): CreateCombatantInput {
  return fromStatted(n.name, n.stats);
}

export function combatantFromMonster(m: Monster): CreateCombatantInput {
  return fromStatted(m.name, m.stats);
}
