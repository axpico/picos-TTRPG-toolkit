import { test } from "node:test";
import assert from "node:assert/strict";
import type { Location as DbLocation } from "@prisma/client";
import { toLocationDto, toPublicLocation } from "../../../src/lib/repos/location.js";

const PINS = JSON.stringify([
  { id: "p1", x: 0.1, y: 0.2, label: "Secret door", color: "#fff", playerVisible: false },
  { id: "p2", x: 0.5, y: 0.5, label: "Town", color: "#0f0", playerVisible: true },
]);
const REVEALS = JSON.stringify([
  { id: "r1", x: 0, y: 0, w: 0.5, h: 0.5, mode: "reveal" },
]);
// One token inside the revealed quadrant, one outside it (under fog).
const TOKENS = JSON.stringify([
  { id: "t1", x: 0.2, y: 0.2, size: 0.04, label: "Goblin", color: "#0f0", imageAssetId: "tok-1", playerVisible: true, hp: 7, hpMax: 7 },
  { id: "t2", x: 0.8, y: 0.8, size: 0.04, label: "Lurker", color: "#f00", imageAssetId: null, playerVisible: true, hp: null, hpMax: null },
  { id: "t3", x: 0.2, y: 0.2, size: 0.04, label: "GM only", color: "#00f", imageAssetId: null, playerVisible: false, hp: null, hpMax: null },
]);

const location = (over: Partial<DbLocation> = {}): DbLocation => ({
  id: "loc",
  campaignId: "camp",
  name: "Old Keep",
  description: "A ruin.",
  gmNotes: "Dragon hoard under the floor.",
  playerNotes: "Looks abandoned.",
  imageAssetId: "asset-123",
  pinsJson: PINS,
  revealsJson: REVEALS,
  tokensJson: TOKENS,
  gridJson: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
});

test("toLocationDto derives imageUrl from imageAssetId", () => {
  assert.equal(toLocationDto(location()).imageUrl, "/api/files/asset-123");
  assert.equal(toLocationDto(location({ imageAssetId: null })).imageUrl, null);
});

test("toLocationDto parses pins and reveals", () => {
  const dto = toLocationDto(location());
  assert.equal(dto.pins.length, 2);
  assert.equal(dto.reveals.length, 1);
});

test("toLocationDto falls back to [] on malformed pins JSON", () => {
  const dto = toLocationDto(location({ pinsJson: "broken" }));
  assert.deepEqual(dto.pins, []);
});

test("toPublicLocation strips gmNotes (not present on the public type)", () => {
  const pub = toPublicLocation(location());
  assert.ok(!("gmNotes" in pub));
});

test("toPublicLocation only includes player-visible pins", () => {
  const pub = toPublicLocation(location());
  assert.equal(pub.pins.length, 1);
  assert.equal(pub.pins[0]!.label, "Town");
});

test("toPublicLocation keeps reveals and player-facing fields", () => {
  const pub = toPublicLocation(location());
  assert.equal(pub.reveals.length, 1);
  assert.equal(pub.playerNotes, "Looks abandoned.");
  assert.equal(pub.imageUrl, "/api/files/asset-123");
});

test("toLocationDto derives a token imageUrl from imageAssetId", () => {
  const dto = toLocationDto(location());
  assert.equal(dto.tokens.length, 3);
  assert.equal(dto.tokens[0]!.imageUrl, "/api/files/tok-1");
  assert.equal(dto.tokens[1]!.imageUrl, null);
});

test("toPublicLocation hides tokens under fog and GM-only tokens", () => {
  const pub = toPublicLocation(location());
  // t1 is visible + inside the reveal; t2 is under fog; t3 is GM-only.
  assert.deepEqual(
    pub.tokens.map((t) => t.id),
    ["t1"],
  );
});

test("toPublicLocation shows all visible tokens when there is no fog", () => {
  const pub = toPublicLocation(location({ revealsJson: "[]" }));
  assert.deepEqual(
    pub.tokens.map((t) => t.id).sort(),
    ["t1", "t2"],
  );
});
