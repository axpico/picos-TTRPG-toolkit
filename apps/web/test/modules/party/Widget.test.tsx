import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

const h = vi.hoisted(() => ({ updateMutate: vi.fn() }));

vi.mock("../../../src/modules/party/api.js", () => ({
  useParty: () => ({
    data: [
      {
        id: "m1",
        userId: null,
        name: "Aria",
        playerName: "Sam",
        hp: 10,
        hpMax: 12,
        gold: 50,
        status: "active",
        conditions: [],
        notes: null,
        stats: {},
        order: 0,
      },
    ],
  }),
  useCampaignMembers: () => ({
    data: [
      { userId: "u-dm", role: "dm", user: { id: "u-dm", username: "gm", displayName: null } },
      { userId: "u-sam", role: "player", user: { id: "u-sam", username: "sam", displayName: "Sam" } },
    ],
  }),
  useCreatePartyMember: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePartyMember: () => ({ mutate: h.updateMutate, isPending: false }),
  useDeletePartyMember: () => ({ mutate: vi.fn(), isPending: false }),
}));

await import("../../../src/modules/party/Widget.js");
const PartyWidget = getWidget("party")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

beforeEach(() => h.updateMutate.mockReset());
afterEach(cleanup);

describe("PartyWidget", () => {
  it("is registered", () => {
    expect(getWidget("party")).toBeTruthy();
  });

  it("shows the member's gold so the Shop can spend it", () => {
    render(<PartyWidget {...ctx} />);
    // The gold input is the only field carrying the value 50 (hp=10, hpMax=12).
    expect(screen.getByDisplayValue("50")).toBeTruthy();
  });

  it("edits gold on blur, persisting via useUpdatePartyMember", () => {
    render(<PartyWidget {...ctx} />);
    const gold = screen.getByDisplayValue("50");
    fireEvent.change(gold, { target: { value: "30" } });
    fireEvent.blur(gold);
    expect(h.updateMutate).toHaveBeenCalledWith({ id: "m1", input: { gold: 30 } });
  });

  it("clamps negative gold to zero", () => {
    render(<PartyWidget {...ctx} />);
    const gold = screen.getByDisplayValue("50");
    fireEvent.change(gold, { target: { value: "-5" } });
    fireEvent.blur(gold);
    expect(h.updateMutate).toHaveBeenCalledWith({ id: "m1", input: { gold: 0 } });
  });

  it("links a player account via the 🔗 picker", () => {
    render(<PartyWidget {...ctx} />);
    const select = screen.getByLabelText("Linked player account for Aria");
    fireEvent.change(select, { target: { value: "u-sam" } });
    expect(h.updateMutate).toHaveBeenCalledWith({ id: "m1", input: { userId: "u-sam" } });
  });

  it("unlinks by selecting the empty option", () => {
    render(<PartyWidget {...ctx} />);
    const select = screen.getByLabelText("Linked player account for Aria");
    fireEvent.change(select, { target: { value: "" } });
    expect(h.updateMutate).toHaveBeenCalledWith({ id: "m1", input: { userId: null } });
  });
});
