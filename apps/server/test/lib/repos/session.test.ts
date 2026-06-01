import { test } from "node:test";
import assert from "node:assert/strict";
import type { Session as DbSession } from "@prisma/client";
import { toSessionDto } from "../../../src/lib/repos/session.js";

const session = (over: Partial<DbSession> = {}): DbSession => ({
  id: "s",
  campaignId: "camp",
  title: "Session 1",
  date: new Date("2026-04-01T00:00:00.000Z"),
  summary: null,
  notes: null,
  externalLinksJson: "[]",
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  updatedAt: new Date("2026-03-01T00:00:00.000Z"),
  ...over,
});

test("serializes the optional date, or null when absent", () => {
  assert.equal(toSessionDto(session()).date, "2026-04-01T00:00:00.000Z");
  assert.equal(toSessionDto(session({ date: null })).date, null);
});

test("parses external links; malformed falls back to []", () => {
  const links = [{ label: "Map", href: "https://example.com" }];
  assert.equal(toSessionDto(session({ externalLinksJson: JSON.stringify(links) })).externalLinks.length, 1);
  assert.deepEqual(toSessionDto(session({ externalLinksJson: "x" })).externalLinks, []);
});
