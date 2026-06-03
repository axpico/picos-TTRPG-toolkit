import { describe, it, expect } from "vitest";
import { emptyStatBlock, type Monster, type NPC, type PartyMember, type StatBlock } from "@toolkit/shared";
import {
  combatantFromMonster,
  combatantFromNpc,
  combatantFromParty,
} from "../../../src/modules/combat/fromLibrary.js";

const stats = (over: Partial<StatBlock> = {}): StatBlock => ({ ...emptyStatBlock(), ...over });

const partyMember = (over: Partial<PartyMember> = {}): PartyMember => ({
  id: "p1",
  campaignId: "camp",
  userId: null,
  name: "Aria",
  playerName: null,
  hp: 18,
  hpMax: 24,
  status: "active",
  conditions: [],
  notes: null,
  portraitAssetId: null,
  stats: stats({ ac: 16 }),
  order: 0,
  ...over,
});

const npc = (over: Partial<NPC> = {}): NPC => ({
  id: "n1",
  campaignId: "camp",
  name: "Innkeeper",
  role: null,
  quirk: null,
  hook: null,
  notes: null,
  tags: [],
  portraitAssetId: null,
  favorite: false,
  locationId: null,
  stats: stats(),
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const monster = (over: Partial<Monster> = {}): Monster => ({
  id: "m1",
  campaignId: "camp",
  name: "Goblin",
  type: null,
  environment: null,
  challenge: null,
  stats: stats(),
  notes: null,
  tags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("combatantFromParty", () => {
  it("carries HP / max HP / AC and flags the combatant as a PC", () => {
    const input = combatantFromParty(partyMember());
    expect(input).toMatchObject({ name: "Aria", hp: 18, hpMax: 24, ac: 16, isPC: true, initiative: 0 });
  });

  it("omits AC when the party member has none", () => {
    const input = combatantFromParty(partyMember({ stats: stats({ ac: null }) }));
    expect(input.ac).toBeUndefined();
    expect(input.isPC).toBe(true);
  });
});

describe("combatantFromNpc / combatantFromMonster", () => {
  it("pulls HP, max HP and AC from the stat block and marks non-PC", () => {
    const input = combatantFromMonster(monster({ stats: stats({ hp: 7, hpMax: 7, ac: 15 }) }));
    expect(input).toMatchObject({ name: "Goblin", hp: 7, hpMax: 7, ac: 15, isPC: false });
  });

  it("falls back to hpMax for current HP when hp is missing (and vice versa)", () => {
    expect(combatantFromNpc(npc({ stats: stats({ hpMax: 12 }) }))).toMatchObject({ hp: 12, hpMax: 12 });
    expect(combatantFromNpc(npc({ stats: stats({ hp: 9 }) }))).toMatchObject({ hp: 9, hpMax: 9 });
  });

  it("omits HP/AC entirely when the stat block is empty", () => {
    const input = combatantFromNpc(npc({ stats: stats() }));
    expect(input.hp).toBeUndefined();
    expect(input.hpMax).toBeUndefined();
    expect(input.ac).toBeUndefined();
    expect(input.isPC).toBe(false);
  });
});
