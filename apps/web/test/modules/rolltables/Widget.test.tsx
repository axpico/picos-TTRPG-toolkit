import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RollTable } from "@toolkit/shared";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

const h = vi.hoisted(() => ({
  tables: [] as RollTable[],
  createMutate: vi.fn(),
  rollMutate: vi.fn(),
}));

vi.mock("../../../src/modules/rolltables/api.js", () => ({
  useRollTables: () => ({ data: h.tables }),
  useCreateTable: () => ({ mutate: h.createMutate, mutateAsync: vi.fn(), isPending: false }),
  useUpdateTable: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTable: () => ({ mutate: vi.fn(), isPending: false }),
  useRollOnTable: () => ({ mutate: h.rollMutate, isPending: false }),
}));

await import("../../../src/modules/rolltables/Widget.js");
const RollTablesWidget = getWidget("rolltables")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

const table = (over: Partial<RollTable> = {}): RollTable => ({
  id: "t1",
  campaignId: "camp",
  name: "Loot",
  description: null,
  entries: [{ weight: 1, text: "Gold" }],
  order: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

beforeEach(() => {
  h.tables = [];
  h.createMutate.mockReset();
  h.rollMutate.mockReset();
});
afterEach(cleanup);

describe("RollTablesWidget", () => {
  it("is registered", () => {
    expect(getWidget("rolltables")).toBeTruthy();
  });

  it("shows the empty state with no tables", () => {
    render(<RollTablesWidget {...ctx} />);
    expect(screen.getByText(/No tables yet/i)).toBeTruthy();
  });

  it("creates a table without a blank seed entry (regression)", async () => {
    const user = userEvent.setup();
    render(<RollTablesWidget {...ctx} />);

    await user.type(screen.getByPlaceholderText(/New table name/i), "Tavern");
    await user.click(screen.getByTitle("Create table"));

    expect(h.createMutate).toHaveBeenCalledTimes(1);
    const payload = h.createMutate.mock.calls[0]![0];
    expect(payload).toEqual({ name: "Tavern" });
    expect(payload).not.toHaveProperty("entries");
  });

  it("disables Roll until an entry has text", () => {
    h.tables = [table({ entries: [{ weight: 1, text: "" }] })];
    render(<RollTablesWidget {...ctx} />);
    expect(screen.getByRole("button", { name: "Roll" })).toHaveProperty("disabled", true);
  });

  it("rolls on a table with entries", async () => {
    const user = userEvent.setup();
    h.tables = [table()];
    render(<RollTablesWidget {...ctx} />);

    const rollBtn = screen.getByRole("button", { name: "Roll" });
    expect(rollBtn).toHaveProperty("disabled", false);
    await user.click(rollBtn);

    expect(h.rollMutate).toHaveBeenCalledTimes(1);
    expect(h.rollMutate.mock.calls[0]![0]).toBe("t1");
  });
});
