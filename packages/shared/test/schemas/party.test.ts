import { test } from "node:test";
import assert from "node:assert/strict";
import {
  partyMemberStatus,
  partyMember,
  publicPartyMember,
  createPartyMemberInput,
  updatePartyMemberInput,
} from "../../src/schemas/party.js";
import { emptyStatBlock } from "../../src/schemas/statblock.js";

test("partyMemberStatus accepts the four known states", () => {
  for (const s of ["active", "down", "stable", "dead"]) {
    assert.equal(partyMemberStatus.safeParse(s).success, true);
  }
});

test("partyMemberStatus rejects unknown states", () => {
  assert.equal(partyMemberStatus.safeParse("zombified").success, false);
});

test("createPartyMemberInput enforces name bounds", () => {
  assert.equal(createPartyMemberInput.safeParse({ name: "" }).success, false);
  assert.equal(createPartyMemberInput.safeParse({ name: "a".repeat(121) }).success, false);
  assert.equal(createPartyMemberInput.safeParse({ name: "Aria" }).success, true);
});

test("createPartyMemberInput caps conditions count and item length", () => {
  assert.equal(
    createPartyMemberInput.safeParse({ name: "Aria", conditions: Array(41).fill("x") }).success,
    false,
  );
  assert.equal(
    createPartyMemberInput.safeParse({ name: "Aria", conditions: ["a".repeat(61)] }).success,
    false,
  );
  assert.equal(
    createPartyMemberInput.safeParse({ name: "Aria", conditions: ["blessed"] }).success,
    true,
  );
});

test("updatePartyMemberInput allows partial fields, order, and nullable userId", () => {
  assert.equal(updatePartyMemberInput.safeParse({}).success, true);
  assert.equal(updatePartyMemberInput.safeParse({ order: 3, userId: null }).success, true);
  assert.equal(updatePartyMemberInput.safeParse({ userId: "u1" }).success, true);
});

const fullMember = {
  id: "pm1",
  campaignId: "camp",
  userId: "u1",
  name: "Aria",
  playerName: "Sam",
  hp: 7,
  hpMax: 9,
  gold: 999,
  status: "active" as const,
  conditions: ["blessed"],
  notes: "secret GM note",
  portraitAssetId: null,
  stats: emptyStatBlock(),
  order: 0,
};

test("publicPartyMember strips owner/DM-private fields", () => {
  const dto = publicPartyMember.parse(fullMember) as Record<string, unknown>;
  assert.equal("notes" in dto, false);
  assert.equal("gold" in dto, false);
  assert.equal("stats" in dto, false);
  assert.equal("playerName" in dto, false);
});

test("publicPartyMember keeps the player-visible fields", () => {
  const dto = publicPartyMember.parse(fullMember);
  assert.equal(dto.name, "Aria");
  assert.equal(dto.userId, "u1");
  assert.equal(dto.hp, 7);
  assert.equal(dto.hpMax, 9);
  assert.equal(dto.status, "active");
  assert.deepEqual(dto.conditions, ["blessed"]);
});

test("partyMember parses a complete member object", () => {
  assert.equal(partyMember.safeParse(fullMember).success, true);
});
