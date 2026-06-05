/**
 * The 15 standard 5e conditions, offered as quick-pick options in the combat
 * tracker's condition editor. Conditions are still stored as a free-form
 * `string[]` on each combatant, so custom entries remain possible alongside
 * these.
 */
export const CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Exhaustion",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
] as const;

export type StandardCondition = (typeof CONDITIONS)[number];
