import { test } from "node:test";
import assert from "node:assert/strict";
import type { Campaign as DbCampaign } from "@prisma/client";
import { toCampaignDto } from "../../../src/lib/repos/campaign.js";

const campaign = (over: Partial<DbCampaign> = {}): DbCampaign => ({
  id: "camp",
  name: "Saltmarsh",
  description: null,
  tagsJson: '["nautical","intro"]',
  joinCode: "JOIN-123",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...over,
});

test("parses tags and maps the join code", () => {
  const dto = toCampaignDto(campaign());
  assert.deepEqual(dto.tags, ["nautical", "intro"]);
  assert.equal(dto.joinCode, "JOIN-123");
});

test("join code may be null; myRole is set by the route, not the mapper", () => {
  const dto = toCampaignDto(campaign({ joinCode: null }));
  assert.equal(dto.joinCode, null);
  assert.equal(dto.myRole, undefined);
});

test("falls back to [] on malformed tags JSON", () => {
  assert.deepEqual(toCampaignDto(campaign({ tagsJson: "x" })).tags, []);
});
