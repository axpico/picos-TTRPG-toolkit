import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "../../src/components/Toast.js";
import type { PlayerState } from "../../src/player/usePlayer.js";

const h = vi.hoisted(() => ({
  state: {
    data: undefined as unknown,
    isLoading: false,
    isError: false,
  },
  statusCb: null as ((s: "live" | "reconnecting") => void) | null,
}));

vi.mock("../../src/player/usePlayer.js", () => ({
  usePlayerState: () => h.state,
}));

vi.mock("../../src/auth/useAuth.js", () => ({
  useMe: () => ({ data: { user: { id: "u1" } } }),
  useLogout: () => ({ mutate: vi.fn() }),
}));

vi.mock("../../src/hooks/useBroadcast.js", () => ({
  useBroadcast: ({ onStatus }: { onStatus?: (s: "live" | "reconnecting") => void }) => {
    h.statusCb = onStatus ?? null;
  },
}));

vi.mock("../../src/player/PlayerDock.js", () => ({
  PlayerDock: () => <aside data-testid="dock" />,
}));

vi.mock("../../src/player/MapStage.js", () => ({
  MapStage: () => <section data-testid="map-stage" />,
}));

vi.mock("../../src/theme/ThemePanel.js", () => ({
  ThemeControl: () => <span />,
}));

vi.mock("../../src/components/BuyMeCoffee.js", () => ({
  BuyMeCoffee: () => <span />,
}));

const { PlayerView } = await import("../../src/player/PlayerView.js");

function playerState(over: Partial<PlayerState> = {}): PlayerState {
  return {
    campaign: { id: "camp", name: "Dragonfall" },
    broadcasts: [],
    data: {
      party: null,
      combat: null,
      weather: null,
      calendar: null,
      map: null,
      rolltable: null,
      clocks: null,
      timers: null,
      dice: null,
    },
    widgets: [],
    ...over,
  };
}

function mount() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/play/camp"]}>
        <Routes>
          <Route path="/play/:campaignId" element={<PlayerView />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  h.state = { data: playerState(), isLoading: false, isError: false };
  h.statusCb = null;
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("PlayerView", () => {
  it("shows skeletons while loading", () => {
    h.state = { data: undefined, isLoading: true, isError: false };
    const { container } = mount();
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows an access error state", () => {
    h.state = { data: undefined, isLoading: false, isError: true };
    mount();
    expect(screen.getByText(/don't have access/i)).toBeTruthy();
  });

  it("shows the waiting state when nothing is broadcast", () => {
    h.state = {
      data: playerState({ broadcasts: [{ widgetKey: "dice", active: false } as PlayerState["broadcasts"][number]] }),
      isLoading: false,
      isError: false,
    };
    mount();
    expect(screen.getAllByText("Dragonfall").length).toBeGreaterThan(0);
    expect(screen.getByText(/Whatever the GM shares/)).toBeTruthy();
  });

  it("renders chip navigation only for present sections", () => {
    const s = playerState({
      broadcasts: [{ widgetKey: "party", active: true } as PlayerState["broadcasts"][number]],
    });
    s.data.party = [];
    s.data.dice = [
      { id: "d1", notation: "1d20", result: 11, label: null, rollerName: null } as unknown as NonNullable<
        PlayerState["data"]["dice"]
      >[number],
    ];
    s.data.clocks = [
      {
        id: "k1",
        name: "Doom",
        segments: 4,
        filled: 1,
        color: "#fff",
        description: null,
      } as unknown as NonNullable<PlayerState["data"]["clocks"]>[number],
    ];
    h.state = { data: s, isLoading: false, isError: false };
    mount();
    const nav = screen.getByRole("navigation", { name: "Stage sections" });
    expect(nav.textContent).toContain("Party");
    expect(nav.textContent).toContain("Clocks");
    expect(nav.textContent).toContain("Dice");
    expect(nav.textContent).not.toContain("Map");
    expect(nav.textContent).not.toContain("Combat");
  });

  it("toasts when the connection recovers after being live", async () => {
    h.state = {
      data: playerState({ broadcasts: [{ widgetKey: "x", active: false } as PlayerState["broadcasts"][number]] }),
      isLoading: false,
      isError: false,
    };
    mount();
    const { act } = await import("@testing-library/react");
    act(() => h.statusCb?.("live"));
    expect(screen.queryByText(/Back online/)).toBeNull(); // first connect is silent
    act(() => h.statusCb?.("reconnecting"));
    act(() => h.statusCb?.("live"));
    expect(screen.getByText(/Back online/)).toBeTruthy();
  });
});
