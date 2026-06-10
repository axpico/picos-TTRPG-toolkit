import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "../../src/components/Toast.js";
import { ConfirmProvider } from "../../src/components/ConfirmDialog.js";

const h = vi.hoisted(() => ({
  statusCb: null as ((s: "live" | "reconnecting") => void) | null,
  copyResult: true,
}));

vi.mock("../../src/campaigns/useCampaigns.js", () => ({
  useCampaign: () => ({
    data: { id: "camp", name: "Dragonfall", joinCode: "JOINCODE123" },
    isLoading: false,
    isError: false,
  }),
  useRotateJoinCode: () => ({ mutate: vi.fn() }),
}));

vi.mock("../../src/auth/useAuth.js", () => ({
  useLogout: () => ({ mutate: vi.fn() }),
}));

vi.mock("../../src/canvas/useLayout.js", () => ({
  useLayoutSync: () => ({ isLoading: false }),
}));

vi.mock("../../src/canvas/InfiniteCanvas.js", () => ({
  InfiniteCanvas: () => <div data-testid="canvas" />,
}));

vi.mock("../../src/canvas/WidgetPalette.js", () => ({
  WidgetPalette: () => null,
}));

vi.mock("../../src/canvas/WidgetRegistry.js", () => ({
  listWidgets: () => [],
}));

vi.mock("../../src/hooks/useBroadcast.js", () => ({
  useBroadcast: ({ onStatus }: { onStatus?: (s: "live" | "reconnecting") => void }) => {
    h.statusCb = onStatus ?? null;
  },
}));

vi.mock("../../src/theme/ThemePanel.js", () => ({
  ThemeControl: () => <span />,
}));

vi.mock("../../src/modules/broadcast/ShareControls.js", () => ({
  ShareControls: () => <span data-testid="share-controls" />,
}));

vi.mock("../../src/modules/register.js", () => ({}));

vi.mock("../../src/lib/clipboard.js", () => ({
  copyText: () => Promise.resolve(h.copyResult),
}));

const { CampaignDashboard } = await import("../../src/campaigns/CampaignDashboard.js");
const { useCanvasStore } = await import("../../src/canvas/store.js");

function mount() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <MemoryRouter initialEntries={["/campaigns/camp"]}>
          <Routes>
            <Route path="/campaigns/:campaignId" element={<CampaignDashboard />} />
          </Routes>
        </MemoryRouter>
      </ConfirmProvider>
    </ToastProvider>,
  );
}

beforeEach(() => {
  h.statusCb = null;
  h.copyResult = true;
  useCanvasStore.setState({ locked: false });
});
afterEach(cleanup);

describe("CampaignDashboard", () => {
  it("toggles widget lock with aria-pressed", () => {
    mount();
    const lock = screen.getByRole("button", { name: /Lock/ });
    expect(lock.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(lock);
    expect(useCanvasStore.getState().locked).toBe(true);
    expect(screen.getByRole("button", { name: /Locked/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows Copied ✓ feedback next to the join code", async () => {
    vi.useFakeTimers();
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Code:/ }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("Copied ✓")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(2_000));
    expect(screen.queryByText("Copied ✓")).toBeNull();
    vi.useRealTimers();
  });

  it("shows the reconnecting chip and a back-online toast on recovery", () => {
    mount();
    expect(screen.queryByText(/Reconnecting/)).toBeNull();
    act(() => h.statusCb?.("reconnecting"));
    expect(screen.getByText(/Reconnecting/)).toBeTruthy();
    act(() => h.statusCb?.("live"));
    expect(screen.queryByText(/Reconnecting/)).toBeNull();
    expect(screen.getByText(/Back online/)).toBeTruthy();
  });
});
