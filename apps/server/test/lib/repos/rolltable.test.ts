import { test } from "node:test";
import assert from "node:assert/strict";
import type { RollTable as DbRollTable } from "@prisma/client";
import { toRollTableDto } from "../../../src/lib/repos/rolltable.js";

const table = (over: Partial<DbRollTable> = {}): DbRollTable => ({
  id: "rt",
  campaignId: "camp",
  name: "Loot",
  description: null,
  entriesJson: JSON.stringify([
    { weight: 1, text: "A rusty key" },
    { weight: 3, text: "A handful of coins" },
  ]),
  order: 0,
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  ...over,
});

test("parses entries", () => {
  const dto = toRollTableDto(table());
  assert.equal(dto.entries.length, 2);
  assert.equal(dto.entries[1]!.text, "A handful of coins");
});

test("falls back to [] on malformed entries JSON", () => {
  assert.deepEqual(toRollTableDto(table({ entriesJson: "broken" })).entries, []);
});

test("serializes dates and passes nullable description through", () => {
  const dto = toRollTableDto(table({ description: "shiny" }));
  assert.equal(dto.createdAt, "2026-05-01T00:00:00.000Z");
  assert.equal(dto.description, "shiny");
});
