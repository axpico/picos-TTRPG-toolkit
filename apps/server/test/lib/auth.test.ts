import { test } from "node:test";
import assert from "node:assert/strict";
import { canManageCharacter, isDm } from "../../src/lib/auth.js";

test("isDm only true for the dm role", () => {
  assert.equal(isDm("dm"), true);
  assert.equal(isDm("player"), false);
  assert.equal(isDm(null), false);
  assert.equal(isDm(undefined), false);
});

test("a DM may manage any character", () => {
  assert.equal(canManageCharacter("u1", "dm", { userId: "u2" }), true);
  assert.equal(canManageCharacter("u1", "dm", { userId: null }), true);
});

test("a player may manage only their own assigned character", () => {
  assert.equal(canManageCharacter("u1", "player", { userId: "u1" }), true);
  assert.equal(canManageCharacter("u1", "player", { userId: "u2" }), false);
  assert.equal(canManageCharacter("u1", "player", { userId: null }), false);
});
