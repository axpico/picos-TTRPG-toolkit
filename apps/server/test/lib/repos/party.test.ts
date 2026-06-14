import { test } from "node:test";
import assert from "node:assert/strict";
import type { PartyMember as DbPartyMember } from "@prisma/client";
import { toPartyDto, toPublicPartyDto } from "../../../src/lib/repos/party.js";

const member = (over: Partial<DbPartyMember> = {}): DbPartyMember => ({
  id: "pm",
  campaignId: "camp",
  userId: null,
  name: "Aria",
  playerName: "Sam",
  hp: 10,
  hpMax: 12,
  gold: 0,
  status: "active",
  conditionsJson: "[]",
  notes: null,
  portraitAssetId: null,
  statsJson: "{}",
  order: 0,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
});

test("valid status passes through", () => {
  assert.equal(toPartyDto(member({ status: "down" })).status, "down");
});

test("unknown status falls back to 'active'", () => {
  assert.equal(toPartyDto(member({ status: "zombified" })).status, "active");
});

test("conditions JSON is parsed, malformed falls back to []", () => {
  assert.deepEqual(toPartyDto(member({ conditionsJson: '["blessed"]' })).conditions, ["blessed"]);
  assert.deepEqual(toPartyDto(member({ conditionsJson: "{" })).conditions, []);
});

test("nullable fields pass through", () => {
  const dto = toPartyDto(member({ playerName: null, notes: null }));
  assert.equal(dto.playerName, null);
  assert.equal(dto.notes, null);
});

test("userId (owning player) passes through", () => {
  assert.equal(toPartyDto(member({ userId: "user-1" })).userId, "user-1");
  assert.equal(toPartyDto(member({ userId: null })).userId, null);
});

test("gold passes through", () => {
  assert.equal(toPartyDto(member({ gold: 25 })).gold, 25);
  assert.equal(toPartyDto(member()).gold, 0);
});

test("parses the stat block (empty default, or stored values)", () => {
  assert.equal(toPartyDto(member()).stats.ac, null);
  assert.equal(toPartyDto(member({ statsJson: '{"ac":17,"abilities":{"str":16}}' })).stats.ac, 17);
  assert.equal(toPartyDto(member({ statsJson: '{"abilities":{"str":16}}' })).stats.abilities.str, 16);
});

test("public DTO omits owner/DM-private fields (notes, gold, stats, playerName)", () => {
  const dto = toPublicPartyDto(
    member({
      notes: "secret GM note",
      gold: 999,
      statsJson: '{"ac":17}',
      playerName: "Sam",
    }),
  ) as Record<string, unknown>;
  assert.equal("notes" in dto, false);
  assert.equal("gold" in dto, false);
  assert.equal("stats" in dto, false);
  assert.equal("playerName" in dto, false);
});

test("public DTO keeps the player-visible fields", () => {
  const dto = toPublicPartyDto(member({ userId: "u1", hp: 7, hpMax: 9, conditionsJson: '["blessed"]' }));
  assert.equal(dto.name, "Aria");
  assert.equal(dto.userId, "u1");
  assert.equal(dto.hp, 7);
  assert.equal(dto.hpMax, 9);
  assert.equal(dto.status, "active");
  assert.deepEqual(dto.conditions, ["blessed"]);
});
