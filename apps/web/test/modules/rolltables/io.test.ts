import { describe, it, expect } from "vitest";
import type { RollTable } from "@toolkit/shared";
import {
  EXPORT_VERSION,
  parseTablesImport,
  serializeTables,
} from "../../../src/modules/rolltables/io.js";

const table = (over: Partial<RollTable> = {}): RollTable => ({
  id: "t1",
  campaignId: "c1",
  name: "Loot",
  description: null,
  entries: [
    { weight: 1, text: "Gold" },
    { weight: 3, text: "Gem" },
  ],
  order: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("serializeTables", () => {
  it("emits a versioned envelope without server-only fields", () => {
    const json = JSON.parse(serializeTables([table()]));
    expect(json.version).toBe(EXPORT_VERSION);
    expect(json.tables).toHaveLength(1);
    expect(json.tables[0]).toEqual({
      name: "Loot",
      entries: [
        { weight: 1, text: "Gold" },
        { weight: 3, text: "Gem" },
      ],
    });
    expect(json.tables[0]).not.toHaveProperty("id");
    expect(json.tables[0]).not.toHaveProperty("createdAt");
  });

  it("includes description only when present", () => {
    const json = JSON.parse(serializeTables([table({ description: "shop stock" })]));
    expect(json.tables[0].description).toBe("shop stock");
  });
});

describe("parseTablesImport", () => {
  it("round-trips serialized tables", () => {
    const inputs = parseTablesImport(serializeTables([table({ description: "d" })]));
    expect(inputs).toEqual([
      {
        name: "Loot",
        description: "d",
        entries: [
          { weight: 1, text: "Gold" },
          { weight: 3, text: "Gem" },
        ],
      },
    ]);
  });

  it("accepts a bare array of tables", () => {
    const inputs = parseTablesImport(
      JSON.stringify([{ name: "Names", entries: [{ weight: 1, text: "Bree" }] }]),
    );
    expect(inputs[0]!.name).toBe("Names");
  });

  it("drops blank-text entries and defaults/clamps weight", () => {
    const inputs = parseTablesImport(
      JSON.stringify({
        tables: [
          {
            name: "T",
            entries: [
              { text: "no weight" },
              { weight: 0, text: "clamped up" },
              { weight: 2, text: "   " },
            ],
          },
        ],
      }),
    );
    expect(inputs[0]!.entries).toEqual([
      { weight: 1, text: "no weight" },
      { weight: 1, text: "clamped up" },
    ]);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseTablesImport("not json")).toThrow();
  });

  it("throws on an unrecognized shape", () => {
    expect(() => parseTablesImport(JSON.stringify({ foo: "bar" }))).toThrow();
  });

  it("throws when a table fails the create schema (empty name)", () => {
    expect(() =>
      parseTablesImport(JSON.stringify({ tables: [{ name: "", entries: [] }] })),
    ).toThrow();
  });

  it("throws when there are no tables", () => {
    expect(() => parseTablesImport(JSON.stringify({ tables: [] }))).toThrow();
  });
});
