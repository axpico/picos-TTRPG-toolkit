import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../../src/player/MyCharacterPanel.js", () => ({
  MyCharacterPanel: () => <div data-testid="character-panel" />,
}));

vi.mock("../../src/player/DicePanel.js", () => ({
  DicePanel: () => <div data-testid="dice-panel" />,
}));

const { PlayerDock } = await import("../../src/player/PlayerDock.js");

afterEach(cleanup);

describe("PlayerDock", () => {
  it("renders the sidebar panels", () => {
    render(<PlayerDock campaignId="camp" />);
    // Sidebar instances (mobile sheets are closed).
    expect(screen.getAllByTestId("character-panel")).toHaveLength(1);
    expect(screen.getAllByTestId("dice-panel")).toHaveLength(1);
  });

  it("opens and closes the mobile character sheet", () => {
    render(<PlayerDock campaignId="camp" />);
    fireEvent.click(screen.getByRole("button", { name: /Character/ }));
    expect(screen.getAllByTestId("character-panel")).toHaveLength(2);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getAllByTestId("character-panel")).toHaveLength(1);
  });

  it("opens the mobile dice sheet", () => {
    render(<PlayerDock campaignId="camp" />);
    fireEvent.click(screen.getByRole("button", { name: /Dice/ }));
    expect(screen.getAllByTestId("dice-panel")).toHaveLength(2);
  });
});
