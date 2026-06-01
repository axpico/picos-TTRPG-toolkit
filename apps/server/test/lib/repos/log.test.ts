import { test } from "node:test";
import assert from "node:assert/strict";
import type { LogEntry as DbLogEntry } from "@prisma/client";
import { toLogDto } from "../../../src/lib/repos/log.js";

const entry = (over: Partial<DbLogEntry> = {}): DbLogEntry => ({
  id: "log",
  campaignId: "camp",
  kind: "dice.roll",
  message: "Rolled 1d20",
  dataJson: null,
  createdAt: new Date("2026-03-04T05:06:07.000Z"),
  ...over,
});

test("known kind passes through", () => {
  assert.equal(toLogDto(entry({ kind: "combat.start" })).kind, "combat.start");
});

test("unknown kind falls back to 'other'", () => {
  assert.equal(toLogDto(entry({ kind: "made.up.kind" })).kind, "other");
});

test("null dataJson maps to null", () => {
  assert.equal(toLogDto(entry({ dataJson: null })).data, null);
});

test("valid dataJson is parsed", () => {
  assert.deepEqual(toLogDto(entry({ dataJson: '{"a":1}' })).data, { a: 1 });
});

test("malformed dataJson falls back to {}", () => {
  assert.deepEqual(toLogDto(entry({ dataJson: "oops" })).data, {});
});

test("createdAt serializes to ISO", () => {
  assert.equal(toLogDto(entry()).createdAt, "2026-03-04T05:06:07.000Z");
});
