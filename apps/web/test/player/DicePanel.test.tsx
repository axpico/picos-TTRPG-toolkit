import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const h = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  history: { data: [] as unknown[] },
}));

vi.mock("../../src/modules/dice/api.js", () => ({
  useDiceHistory: () => h.history,
  useRollDice: () => ({ mutate: h.mutate, isPending: h.isPending }),
}));

vi.mock("../../src/auth/useAuth.js", () => ({
  useMe: () => ({ data: { user: { id: "u1" } } }),
}));

const { DicePanel } = await import("../../src/player/DicePanel.js");

beforeEach(() => {
  h.mutate = vi.fn();
  h.isPending = false;
  h.history = { data: [] };
});
afterEach(cleanup);

describe("DicePanel", () => {
  it("rolls the typed notation", () => {
    render(<DicePanel campaignId="camp" />);
    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    expect(h.mutate).toHaveBeenCalledWith({ notation: "1d20", advantage: undefined });
  });

  it("rolls with advantage", () => {
    render(<DicePanel campaignId="camp" />);
    fireEvent.click(screen.getByRole("button", { name: "Advantage" }));
    expect(h.mutate).toHaveBeenCalledWith({ notation: "1d20", advantage: "adv" });
  });

  it("quick buttons replace the default notation", () => {
    render(<DicePanel campaignId="camp" />);
    fireEvent.click(screen.getByRole("button", { name: "d6" }));
    expect((screen.getByPlaceholderText("e.g. 2d6+3") as HTMLInputElement).value).toBe("1d6");
  });

  it("disables Roll while pending or when notation is empty", () => {
    h.isPending = true;
    render(<DicePanel campaignId="camp" />);
    expect((screen.getByRole("button", { name: "Roll" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
