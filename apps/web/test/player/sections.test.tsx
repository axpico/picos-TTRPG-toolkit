import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { Combatant, Encounter, PartyMember, ProgressClock, DiceRoll, Timer } from "@toolkit/shared";
import {
  CombatSection,
  PartySection,
  ClocksSection,
  TimersSection,
  DiceFeedSection,
  TurnBanner,
  myTurnStatus,
} from "../../src/player/sections.js";

afterEach(cleanup);

function combatant(over: Partial<Combatant>): Combatant {
  return {
    id: "c1",
    encounterId: "e1",
    name: "Goblin",
    initiative: 10,
    hp: 7,
    hpMax: 7,
    ac: 13,
    defeated: false,
    conditions: [],
    notes: null,
    isPC: false,
    order: 0,
    ...over,
  };
}

function encounter(over: Partial<Encounter>): Encounter {
  return {
    id: "e1",
    campaignId: "camp",
    name: "Ambush",
    round: 2,
    currentTurn: 0,
    active: true,
    combatants: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function member(over: Partial<PartyMember>): PartyMember {
  return {
    id: "m1",
    campaignId: "camp",
    userId: null,
    name: "Tilda",
    playerName: null,
    hp: 12,
    hpMax: 20,
    gold: 0,
    status: "active",
    conditions: [],
    notes: null,
    portraitAssetId: null,
    stats: {} as PartyMember["stats"],
    order: 0,
    ...over,
  };
}

describe("CombatSection", () => {
  it("highlights the current turn and shows round + conditions", () => {
    const enc = encounter({
      combatants: [
        combatant({ id: "a", name: "Goblin", initiative: 15 }),
        combatant({ id: "b", name: "Tilda", isPC: true, conditions: ["Prone"] }),
      ],
      currentTurn: 1,
      round: 3,
    });
    render(<CombatSection combat={enc} />);
    expect(screen.getByText("Round 3")).toBeTruthy();
    expect(screen.getByText("Prone")).toBeTruthy();
    expect(screen.getByText("PC")).toBeTruthy();
    // The current combatant's row carries the turn marker.
    expect(screen.getByText("▸")).toBeTruthy();
  });

  it("shows an empty message without combatants", () => {
    render(<CombatSection combat={encounter({})} />);
    expect(screen.getByText("No combatants.")).toBeTruthy();
  });
});

describe("myTurnStatus", () => {
  const party = [member({ id: "m1", userId: "u1", name: "Tilda" })];

  it("returns current when the player's PC is up", () => {
    const enc = encounter({
      combatants: [combatant({ id: "a", name: "Tilda", isPC: true }), combatant({ id: "b" })],
      currentTurn: 0,
    });
    expect(myTurnStatus(enc, party, "u1")).toEqual({ status: "current", name: "Tilda" });
  });

  it("returns next when the player's PC is on deck", () => {
    const enc = encounter({
      combatants: [combatant({ id: "a" }), combatant({ id: "b", name: "Tilda", isPC: true })],
      currentTurn: 0,
    });
    expect(myTurnStatus(enc, party, "u1")).toEqual({ status: "next", name: "Tilda" });
  });

  it("returns null for inactive combat, missing player, or defeated PC", () => {
    const enc = encounter({
      combatants: [combatant({ id: "a", name: "Tilda", isPC: true })],
    });
    expect(myTurnStatus(encounter({ active: false, combatants: enc.combatants }), party, "u1")).toBeNull();
    expect(myTurnStatus(enc, party, "other")).toBeNull();
    expect(myTurnStatus(enc, party, undefined)).toBeNull();
    const defeated = encounter({
      combatants: [combatant({ id: "a", name: "Tilda", isPC: true, defeated: true })],
    });
    expect(myTurnStatus(defeated, party, "u1")).toBeNull();
  });
});

describe("TurnBanner", () => {
  it("announces the player's turn via role=status", () => {
    render(<TurnBanner turn={{ status: "current", name: "Tilda" }} />);
    expect(screen.getByRole("status").textContent).toContain("You're up, Tilda!");
  });

  it("shows the on-deck variant", () => {
    render(<TurnBanner turn={{ status: "next", name: "Tilda" }} />);
    expect(screen.getByText("You're on deck")).toBeTruthy();
  });
});

describe("PartySection", () => {
  it("marks the viewer's character with a You chip", () => {
    render(
      <PartySection
        party={[member({ id: "m1", userId: "u1", name: "Tilda" }), member({ id: "m2", name: "Bron" })]}
        myId="u1"
      />,
    );
    expect(screen.getByText("You")).toBeTruthy();
    expect(screen.getByText("Bron")).toBeTruthy();
  });

  it("shows an empty message for an empty party", () => {
    render(<PartySection party={[]} myId={undefined} />);
    expect(screen.getByText("No party members listed.")).toBeTruthy();
  });
});

describe("ClocksSection", () => {
  it("renders progress and flags full clocks", () => {
    const clocks: ProgressClock[] = [
      {
        id: "k1",
        campaignId: "camp",
        name: "Doom",
        segments: 4,
        filled: 4,
        color: "#f43f5e",
        secret: false,
        description: "The ritual",
        order: 0,
      } as ProgressClock,
    ];
    render(<ClocksSection clocks={clocks} />);
    expect(screen.getByText("Doom")).toBeTruthy();
    expect(screen.getByText("4/4")).toBeTruthy();
    expect(screen.getByText("The ritual")).toBeTruthy();
  });
});

describe("TimersSection", () => {
  it("renders timer names and countdowns", () => {
    vi.useFakeTimers();
    const timers: Timer[] = [
      {
        id: "t1",
        campaignId: "camp",
        name: "Trap",
        durationSeconds: 90,
        remainingSeconds: 90,
        endsAt: null,
        color: "#ef4444",
        secret: false,
        order: 0,
      } as Timer,
    ];
    render(<TimersSection timers={timers} />);
    expect(screen.getByText("Trap")).toBeTruthy();
    expect(screen.getByText("1:30")).toBeTruthy();
    vi.useRealTimers();
  });
});

describe("DiceFeedSection", () => {
  it("renders notation, result and roller", () => {
    const dice: DiceRoll[] = [
      {
        id: "d1",
        campaignId: "camp",
        notation: "2d6+1",
        result: 9,
        label: "attack",
        rollerName: "Tilda",
        hidden: false,
        breakdownJson: "[]",
        createdAt: "2026-01-01T00:00:00Z",
      } as unknown as DiceRoll,
    ];
    render(<DiceFeedSection dice={dice} />);
    expect(screen.getByText("2d6+1")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
    expect(screen.getByText("Tilda")).toBeTruthy();
  });
});
