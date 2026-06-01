import { test } from "node:test";
import assert from "node:assert/strict";
import type { ProgressClock as DbClock } from "@prisma/client";
import { toClockDto } from "../../../src/lib/repos/clock.js";

const clock = (over: Partial<DbClock> = {}): DbClock => ({
  id: "clk",
  campaignId: "camp",
  name: "Doom",
  segments: 6,
  filled: 2,
  description: null,
  color: "#6366f1",
  order: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...over,
});

test("maps all fields and serializes dates", () => {
  const dto = toClockDto(clock({ filled: 3, description: "The cult's plan" }));
  assert.equal(dto.name, "Doom");
  assert.equal(dto.segments, 6);
  assert.equal(dto.filled, 3);
  assert.equal(dto.description, "The cult's plan");
  assert.equal(dto.createdAt, "2026-01-01T00:00:00.000Z");
});
