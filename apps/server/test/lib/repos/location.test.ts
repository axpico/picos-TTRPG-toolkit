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
