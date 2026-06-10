import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { PartyMember } from "@toolkit/shared";

const h = vi.hoisted(() => ({
  character: { data: null as unknown, isLoading: false },
  mutate: vi.fn(),
  isPending: false,
  sheetProps: null as Record<string, unknown> | null,
}));

vi.mock("../../src/player/usePlayer.js", () => ({
  useMyCharacter: () => h.character,
  useUpdateMyCharacter: () => ({ mutate: h.mutate, isPending: h.isPending }),
}));

vi.mock("../../src/components/statblock/CreatureSheetModal.js", () => ({
  CreatureSheetModal: (props: Record<string, unknown>) => {
    h.sheetProps = props;
    return <div data-testid="sheet-modal" />;
  },
}));

const { MyCharacterPanel } = await import("../../src/player/MyCharacterPanel.js");

function character(over: Partial<PartyMember>): PartyMember {
  return {
    id: "m1",
    campaignId: "camp",
    userId: "u1",
    name: "Tilda",
    playerName: "Ale",
    hp: 12,
    hpMax: 20,
    gold: 0,
    status: "active",
    conditions: ["Poisoned"],
    notes: null,
    portraitAssetId: null,
    stats: {} as PartyMember["stats"],
    order: 0,
    ...over,
  };
}

beforeEach(() => {
  h.character = { data: null, isLoading: false };
  h.mutate = vi.fn();
  h.isPending = false;
  h.sheetProps = null;
});
afterEach(cleanup);

describe("MyCharacterPanel", () => {
  it("shows a no-character empty state with GM guidance", () => {
    render(<MyCharacterPanel campaignId="camp" />);
    expect(screen.getByText("No character linked")).toBeTruthy();
    expect(screen.getByText(/Ask your GM/)).toBeTruthy();
  });

  it("renders the character with HP and conditions", () => {
    h.character = { data: character({}), isLoading: false };
    render(<MyCharacterPanel campaignId="camp" />);
    expect(screen.getByText("Tilda")).toBeTruthy();
    expect(screen.getByText("12/20 HP")).toBeTruthy();
    expect(screen.getByText(/Poisoned/)).toBeTruthy();
  });

  it("applies damage clamped by the helper", () => {
    h.character = { data: character({}), isLoading: false };
    render(<MyCharacterPanel campaignId="camp" />);
    fireEvent.click(screen.getByRole("button", { name: "Damage" }));
    expect(h.mutate).toHaveBeenCalledWith({ hp: 11 });
  });

  it("removes a condition when its chip is clicked", () => {
    h.character = { data: character({}), isLoading: false };
    render(<MyCharacterPanel campaignId="camp" />);
    fireEvent.click(screen.getByRole("button", { name: /Poisoned/ }));
    expect(h.mutate).toHaveBeenCalledWith({ conditions: [] });
  });

  it("opens an editable sheet that saves stats via the my-character mutation", () => {
    h.character = { data: character({}), isLoading: false };
    render(<MyCharacterPanel campaignId="camp" />);
    fireEvent.click(screen.getByRole("button", { name: /Sheet/ }));
    expect(h.sheetProps).toBeTruthy();
    expect(h.sheetProps!.readOnly).toBeFalsy();
    const onChange = h.sheetProps!.onChange as (next: unknown) => void;
    expect(typeof onChange).toBe("function");
    onChange({ ac: 15 });
    expect(h.mutate).toHaveBeenCalledWith({ stats: { ac: 15 } });
  });

  it("disables Damage/Heal while an update is in flight", () => {
    h.character = { data: character({}), isLoading: false };
    h.isPending = true;
    render(<MyCharacterPanel campaignId="camp" />);
    expect((screen.getByRole("button", { name: "Damage" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Heal" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
