import { describe, it, expect } from "vitest";
import {
  getWidget,
  listWidgets,
  registerWidget,
} from "../../src/canvas/WidgetRegistry.js";

const Noop = () => null;

describe("WidgetRegistry", () => {
  it("registers and retrieves a widget by type", () => {
    registerWidget({ type: "test-a", title: "Alpha", defaultSize: { w: 1, h: 1 }, Component: Noop });
    const def = getWidget("test-a");
    expect(def?.title).toBe("Alpha");
  });

  it("returns undefined for an unknown type", () => {
    expect(getWidget("does-not-exist")).toBeUndefined();
  });

  it("registering the same type again overwrites it", () => {
    registerWidget({ type: "test-b", title: "First", defaultSize: { w: 1, h: 1 }, Component: Noop });
    registerWidget({ type: "test-b", title: "Second", defaultSize: { w: 2, h: 2 }, Component: Noop });
    expect(getWidget("test-b")?.title).toBe("Second");
  });

  it("listWidgets returns definitions sorted by title", () => {
    registerWidget({ type: "z-widget", title: "Zeta", defaultSize: { w: 1, h: 1 }, Component: Noop });
    registerWidget({ type: "m-widget", title: "Mu", defaultSize: { w: 1, h: 1 }, Component: Noop });
    const titles = listWidgets().map((w) => w.title);
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  it("an optional icon round-trips through getWidget", () => {
    registerWidget({ type: "test-icon", title: "Iconic", defaultSize: { w: 1, h: 1 }, icon: "✦", Component: Noop });
    expect(getWidget("test-icon")?.icon).toBe("✦");
  });
});
