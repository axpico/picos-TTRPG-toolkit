import { test } from "node:test";
import assert from "node:assert/strict";
import type { Broadcast as DbBroadcast } from "@prisma/client";
import { toBroadcastDto } from "../../../src/lib/repos/broadcast.js";

const broadcast = (over: Partial<DbBroadcast> = {}): DbBroadcast => ({
  id: "b",
  campaignId: "camp",
  widgetKey: "party",
  active: true,
  payloadJson: "{}",
  updatedAt: new Date("2026-02-02T00:00:00.000Z"),
  ...over,
});

test("maps core fields and serializes updatedAt", () => {
  const dto = toBroadcastDto(broadcast());
  assert.equal(dto.widgetKey, "party");
  assert.equal(dto.active, true);
  assert.equal(dto.updatedAt, "2026-02-02T00:00:00.000Z");
});

test("parses the payload JSON", () => {
  const dto = toBroadcastDto(broadcast({ payloadJson: '{"locationId":"loc-1"}' }));
  assert.deepEqual(dto.payload, { locationId: "loc-1" });
});

test("falls back to {} on malformed payload", () => {
  assert.deepEqual(toBroadcastDto(broadcast({ payloadJson: "oops" })).payload, {});
});
