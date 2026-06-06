import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

const h = vi.hoisted(() => ({
  nextMutate: vi.fn(),
  advanceCalendarMutate: vi.fn(),
  updatePartyMutate: vi.fn(),
  encounters: { data: [] as unknown[] },
  party: { data: [] as unknown[] },
}));

vi.mock("../../../src/modules/combat/api.js", () => ({
  useEncounters: () => h.encounters,
  useCreateEncounter: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateEncounter: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteEncounter: () => ({ mutate: vi.fn(), isPending: false }),
  useNextTurn: () => ({ mutate: h.nextMutate, isPending: false }),
  usePrevTurn: () => ({ mutate: vi.fn(), isPending: false }),
  useRollInitiative: () => ({ mutate: vi.fn(), isPending: false }),
  useAddCombatant: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCombatant: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveCombatant: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../../../src/modules/calendar/api.js", () => ({
  useAdvanceCalendar: () => ({ mutate: h.advanceCalendarMutate, isPending: false }),
}));

vi.mock("../../../src/modules/party/api.js", () => ({
  useParty: () => h.party,
  useUpdatePartyMember: () => ({ mutate: h.updatePartyMutate, isPending: false }),
}));

vi.mock("../../../src/modules/npc/api.js", () => ({
  useNpcs: () => ({ data: [] }),
}));

vi.mock("../../../src/modules/bestiary/api.js", () => ({
  useMonsters: () => ({ data: [] }),
}));

await import("../../../src/modules/combat/Widget.js");
const CombatWidget = getWidget("combat")!.Component;

const ENCOUNTER = {
  id: "e1",
  campaignId: "camp",
  name: "Goblins",
  round: 1,
  currentTurn: 0,
  active: true,
  combatants: [
    {
      id: "c1",
      encounterId: "e1",
      name: "Goblin",
      initiative: 12,
      hp: 7,
      hpMax: 7,
      ac: 13,
      defeated: false,
      conditions: [],
      notes: null,
      isPC: false,
      order: 0,
    },
  ],
};

const ctx = (over: Partial<Record<string, unknown>> = {}) => ({
  campaignId: "camp",
  instanceId: "i1",
  state: undefined,
  setState: vi.fn(),
  ...over,
});

// An active encounter whose current combatant is a PC, so its row auto-expands
// (exposing the HP controls) and HP edits are eligible to sync back to the party.
const PC_ENCOUNTER = {
  ...ENCOUNTER,
  combatants: [
    {
      id: "c1",
      encounterId: "e1",
      name: "Aria",
      initiative: 15,
      hp: 7,
      hpMax: 10,
      ac: 14,
      defeated: false,
      conditions: [],
      notes: null,
      isPC: true,
      order: 0,
    },
  ],
};

const member = (over: Record<string, unknown> = {}) => ({
  id: "pm1",
  name: "Aria",
  hp: 7,
  hpMax: 10,
  gold: 0,
  status: "active",
  conditions: [],
  stats: {},
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.encounters.data = [ENCOUNTER];
  h.party.data = [];
  // jsdom has no layout engine; the active combatant auto-scrolls on mount.
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("CombatWidget", () => {
  it("is registered", () => {
    expect(getWidget("combat")).toBeTruthy();
  });

  it("mounts with no encounters without crashing", () => {
    h.encounters.data = [];
    expect(() => render(<CombatWidget {...ctx()} />)).not.toThrow();
  });

  it("toggling 'Advance world time' persists the choice via setState", () => {
    const c = ctx();
    render(<CombatWidget {...c} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Advance world time" }));
    expect(c.setState).toHaveBeenCalledWith({ advanceWorldTime: true });
  });

  it("advances the in-world clock one round per combat round when enabled", () => {
    h.nextMutate.mockImplementation((_id, opts) =>
      opts.onSuccess({ ...ENCOUNTER, round: 2 }),
    );
    render(<CombatWidget {...ctx({ state: { advanceWorldTime: true } })} />);
    fireEvent.click(screen.getByRole("button", { name: "Next turn →" }));
    expect(h.advanceCalendarMutate).toHaveBeenCalledWith({ rounds: 1 });
  });

  it("does not touch the clock when 'Advance world time' is off", () => {
    h.nextMutate.mockImplementation((_id, opts) =>
      opts.onSuccess({ ...ENCOUNTER, round: 2 }),
    );
    render(<CombatWidget {...ctx({ state: { advanceWorldTime: false } })} />);
    fireEvent.click(screen.getByRole("button", { name: "Next turn →" }));
    expect(h.advanceCalendarMutate).not.toHaveBeenCalled();
  });
});

describe("CombatWidget → Party HP sync", () => {
  it("mirrors a PC combatant's HP change onto the one matching party member", () => {
    h.encounters.data = [PC_ENCOUNTER];
    h.party.data = [member()];
    render(<CombatWidget {...ctx()} />);
    // The active PC row auto-expands; bump HP from 7 → 8.
    fireEvent.click(screen.getByRole("button", { name: "Increase HP by 1" }));
    expect(h.updatePartyMutate).toHaveBeenCalledWith({ id: "pm1", input: { hp: 8 } });
  });

  it("does not sync when the combatant is not a PC", () => {
    h.encounters.data = [
      { ...PC_ENCOUNTER, combatants: [{ ...PC_ENCOUNTER.combatants[0]!, isPC: false }] },
    ];
    h.party.data = [member()];
    render(<CombatWidget {...ctx()} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase HP by 1" }));
    expect(h.updatePartyMutate).not.toHaveBeenCalled();
  });

  it("does not sync when the name is ambiguous (two members match)", () => {
    h.encounters.data = [PC_ENCOUNTER];
    h.party.data = [member({ id: "pm1" }), member({ id: "pm2" })];
    render(<CombatWidget {...ctx()} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase HP by 1" }));
    expect(h.updatePartyMutate).not.toHaveBeenCalled();
  });

  it("does not sync when no party member matches by name", () => {
    h.encounters.data = [PC_ENCOUNTER];
    h.party.data = [member({ name: "Borin" })];
    render(<CombatWidget {...ctx()} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase HP by 1" }));
    expect(h.updatePartyMutate).not.toHaveBeenCalled();
  });
});
