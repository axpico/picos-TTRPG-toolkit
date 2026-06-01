import { describe, it, expect } from "vitest";
import { filterWidgets } from "../../src/canvas/widget-filter.js";
import type { WidgetDefinition } from "../../src/canvas/WidgetRegistry.js";

const Noop = () => null;
const def = (type: string, title: string): WidgetDefinition => ({
  type,
  title,
  defaultSize: { w: 1, h: 1 },
  Component: Noop,
});

const list = [def("dice", "Dice Roller"), def("combat", "Combat Tracker"), def("clocks", "Progress Clocks")];

describe("filterWidgets", () => {
  it("returns everything for a blank query", () => {
    expect(filterWidgets(list, "")).toHaveLength(3);
    expect(filterWidgets(list, "   ")).toHaveLength(3);
  });

  it("matches case-insensitively on the title", () => {
    expect(filterWidgets(list, "dice").map((w) => w.type)).toEqual(["dice"]);
    expect(filterWidgets(list, "CLOCK").map((w) => w.type)).toEqual(["clocks"]);
  });

  it("narrows to a single item by substring", () => {
    expect(filterWidgets(list, "co").map((w) => w.type)).toEqual(["combat"]);
  });

  it("preserves input order across multiple matches", () => {
    // "r" appears in every title; order must match the input list.
    expect(filterWidgets(list, "r").map((w) => w.type)).toEqual(["dice", "combat", "clocks"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterWidgets(list, "zzz")).toEqual([]);
  });
});
