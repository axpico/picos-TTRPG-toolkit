import { test } from "node:test";
import assert from "node:assert/strict";
import type { Timer as DbTimer } from "@prisma/client";
import { toTimerDto } from "../../../src/lib/repos/timer.js";

const timer = (over: Partial<DbTimer> = {}): DbTimer => ({
  id: "t1",
  campaignId: "camp",
  name: "Short Rest",
  durationSeconds: 3600,
  endsAt: new Date("2026-01-01T01:00:00.000Z"),
  remainingSeconds: 1800,
  color: "#ff0000",
  secret: false,
  order: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:30:00.000Z"),
  ...over,
});

test("endsAt Date is serialized to an ISO string", () => {
  assert.equal(toTimerDto(timer()).endsAt, "2026-01-01T01:00:00.000Z");
});

test("null endsAt passes through as null", () => {
  assert.equal(toTimerDto(timer({ endsAt: null })).endsAt, null);
});

test("scalar fields pass through", () => {
  const dto = toTimerDto(timer({ durationSeconds: 60, remainingSeconds: 30, secret: true, order: 4 }));
  assert.equal(dto.durationSeconds, 60);
  assert.equal(dto.remainingSeconds, 30);
  assert.equal(dto.secret, true);
  assert.equal(dto.order, 4);
  assert.equal(dto.color, "#ff0000");
  assert.equal(dto.campaignId, "camp");
});

test("timestamps are serialized to ISO strings", () => {
  const dto = toTimerDto(timer());
  assert.equal(dto.createdAt, "2026-01-01T00:00:00.000Z");
  assert.equal(dto.updatedAt, "2026-01-01T00:30:00.000Z");
});
