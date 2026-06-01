import { test } from "node:test";
import assert from "node:assert/strict";
import type { StickyNote as DbSticky } from "@prisma/client";
import { toStickyDto } from "../../../src/lib/repos/sticky.js";

test("maps geometry and serializes dates", () => {
  const row: DbSticky = {
    id: "n",
    campaignId: "camp",
    text: "Remember the password",
    color: "#fde68a",
    x: 12,
    y: 34,
    width: 220,
    height: 160,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };
  const dto = toStickyDto(row);
  assert.equal(dto.text, "Remember the password");
  assert.deepEqual([dto.x, dto.y, dto.width, dto.height], [12, 34, 220, 160]);
  assert.equal(dto.updatedAt, "2026-01-02T00:00:00.000Z");
});
