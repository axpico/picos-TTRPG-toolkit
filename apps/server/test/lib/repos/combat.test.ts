import { test } from "node:test";
import assert from "node:assert/strict";
import type { Combatant as DbCombatant, Encounter as DbEncounter } from "@prisma/client";
import { toCombatantDto, toEncounterDto } from "../../../src/lib/repos/combat.js";

const combatant = (over: Partial<DbCombatant>): DbCombatant => ({
  id: "cmb",
  encounterId: "enc",
  name: "Goblin",
  initiative: 10,
  hp: 7,
  hpMax: 7,
  conditionsJson: "[]",
  notes: null,
  isPC: false,
  order: 0,
  ...over,
});

test("toCombatantDto parses conditions JSON", () => {
  const dto = toCombatantDto(combatant({ conditionsJson: '["poisoned","prone"]' }));
  assert.deepEqual(dto.conditions, ["poisoned", "prone"]);
});

test("toCombatantDto falls back to [] on malformed conditions", () => {
  const dto = toCombatantDto(combatant({ conditionsJson: "nope" }));
  assert.deepEqual(dto.conditions, []);
});

test("toEncounterDto sorts by order, then initiative descending", () => {
  const enc: DbEncounter & { combatants: DbCombatant[] } = {
    id: "enc",
    campaignId: "camp",
    name: "Ambush",
    round: 1,
    currentTurn: 0,
    active: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    combatants: [
      combatant({ id: "a", name: "A", order: 1, initiative: 5 }),
      combatant({ id: "b", name: "B", order: 0, initiative: 12 }),
      combatant({ id: "c", name: "C", order: 0, initiative: 20 }),
    ],
  };
  const dto = toEncounterDto(enc);
  assert.deepEqual(
    dto.combatants.map((c) => c.name),
    ["C", "B", "A"],
  );
});

test("toEncounterDto serializes dates to ISO strings", () => {
  const enc: DbEncounter & { combatants: DbCombatant[] } = {
    id: "enc",
    campaignId: "camp",
    name: "x",
    round: 2,
    currentTurn: 1,
    active: false,
    createdAt: new Date("2026-01-02T03:04:05.000Z"),
    updatedAt: new Date("2026-01-02T03:04:05.000Z"),
    combatants: [],
  };
  const dto = toEncounterDto(enc);
  assert.equal(dto.createdAt, "2026-01-02T03:04:05.000Z");
});
