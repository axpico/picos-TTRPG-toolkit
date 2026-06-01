import { test } from "node:test";
import assert from "node:assert/strict";
import type { Campaign as DbCampaign } from "@prisma/client";
import { toCampaignDto } from "../../../src/lib/repos/campaign.js";

const campaign = (over: Partial<DbCampaign> = {}): DbCampaign => ({
  id: "camp",
  name: "Saltmarsh",
  description: null,
  tagsJson: '["nautical","intro"]',
  shareToken: "tok",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...over,
});

test("parses tags and exposes the share token", () => {
  const dto = toCampaignDto(campaign());
  assert.deepEqual(dto.tags, ["nautical", "intro"]);
  assert.equal(dto.shareToken, "tok");
});

test("falls back to [] on malformed tags JSON", () => {
  assert.deepEqual(toCampaignDto(campaign({ tagsJson: "x" })).tags, []);
});
