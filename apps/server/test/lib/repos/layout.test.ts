import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultLayout } from "@toolkit/shared";
import type { Layout as DbLayout } from "@prisma/client";
import { toLayoutDto } from "../../../src/lib/repos/layout.js";

const layoutRow = (over: Partial<DbLayout> = {}): DbLayout => ({
  id: "lay",
  campaignId: "camp",
  itemsJson: JSON.stringify([
    { instanceId: "w1", moduleType: "dice", x: 0, y: 0, w: 360, h: 400 },
  ]),
  viewportX: 5,
  viewportY: 6,
  viewportScale: 1.5,
  updatedAt: new Date(0),
  ...over,
});

test("returns the default layout when the row is null", () => {
  assert.deepEqual(toLayoutDto(null), defaultLayout);
});

test("parses items and viewport", () => {
  const dto = toLayoutDto(layoutRow());
  assert.equal(dto.items.length, 1);
  assert.equal(dto.items[0]!.moduleType, "dice");
  assert.deepEqual(dto.viewport, { x: 5, y: 6, scale: 1.5 });
});

test("falls back to [] items on malformed JSON", () => {
  assert.deepEqual(toLayoutDto(layoutRow({ itemsJson: "broken" })).items, []);
});
