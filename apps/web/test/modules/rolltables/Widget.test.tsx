import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/rolltables/api.js", () => ({
  useRollTables: () => ({ data: [] }),
  useCreateTable: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateTable: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTable: () => ({ mutate: vi.fn(), isPending: false }),
  useRollOnTable: () => ({ mutate: vi.fn(), isPending: false }),
}));

await import("../../../src/modules/rolltables/Widget.js");
const RollTablesWidget = getWidget("rolltables")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("RollTablesWidget", () => {
  it("is registered", () => {
    expect(getWidget("rolltables")).toBeTruthy();
  });

  it("mounts with no tables without crashing", () => {
    expect(() => render(<RollTablesWidget {...ctx} />)).not.toThrow();
  });
});
