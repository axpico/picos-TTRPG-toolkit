import { test } from "node:test";
import assert from "node:assert/strict";
import type { DiceRoll as DbDiceRoll } from "@prisma/client";
import { toDiceDto, visibleRolls } from "../../../src/lib/repos/dice.js";

const row = (over: Partial<DbDiceRoll> = {}): DbDiceRoll => ({
  id: "r1",
  campaignId: "camp",
  userId: "u1",
  notation: "1d20",
  result: 14,
  breakdownJson: "[]",
  label: null,
  hidden: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ...over,
});

test("toDiceDto resolves roller name (displayName preferred) and carries hidden", () => {
  const dto = toDiceDto(row({ hidden: true }), { displayName: "GM", username: "gm1" });
  assert.equal(dto.rollerName, "GM");
  assert.equal(dto.hidden, true);
  assert.equal(dto.createdAt, "2026-01-01T00:00:00.000Z");
});

test("toDiceDto falls back to username, then null", () => {
  assert.equal(toDiceDto(row(), { displayName: null, username: "gm1" }).rollerName, "gm1");
  assert.equal(toDiceDto(row(), null).rollerName, null);
});

test("visibleRolls hides hidden rolls from non-DMs", () => {
  const rolls = [
    { id: "a", hidden: false },
    { id: "b", hidden: true },
  ];
  assert.deepEqual(
    visibleRolls(rolls, "player").map((r) => r.id),
    ["a"],
  );
  // Undefined role (no membership) is treated as non-DM.
  assert.deepEqual(
    visibleRolls(rolls, undefined).map((r) => r.id),
    ["a"],
  );
});

test("visibleRolls shows every roll to the DM", () => {
  const rolls = [
    { id: "a", hidden: false },
    { id: "b", hidden: true },
  ];
  assert.deepEqual(
    visibleRolls(rolls, "dm").map((r) => r.id),
    ["a", "b"],
  );
});
