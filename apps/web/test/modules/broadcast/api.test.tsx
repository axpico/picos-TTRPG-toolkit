import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const get = vi.fn();
const put = vi.fn();
vi.mock("../../../src/api/client.js", () => ({
  api: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) },
}));

const { useWidgetBroadcast } = await import("../../../src/modules/broadcast/api.js");

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  get.mockReset();
  put.mockReset();
});

describe("useWidgetBroadcast", () => {
  it("reads active + payload from the matching broadcast slot", async () => {
    get.mockResolvedValue([
      { campaignId: "c1", widgetKey: "shop:1", active: true, payload: { shopId: "s1" }, updatedAt: "" },
    ]);
    const { result } = renderHook(() => useWidgetBroadcast("c1", "shop:1"), { wrapper });
    await waitFor(() => expect(result.current.active).toBe(true));
    expect(result.current.payload).toEqual({ shopId: "s1" });
  });

  it("share() activates the slot and PUTs the payload under the encoded key", async () => {
    get.mockResolvedValue([]);
    put.mockResolvedValue({});
    const { result } = renderHook(() => useWidgetBroadcast("c1", "shop:1"), { wrapper });
    await waitFor(() => expect(result.current.active).toBe(false));
    act(() => result.current.share({ shopId: "s2" }));
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put).toHaveBeenCalledWith("/api/campaigns/c1/broadcasts/shop%3A1", {
      active: true,
      payload: { shopId: "s2" },
    });
  });

  it("stop() deactivates the slot", async () => {
    get.mockResolvedValue([]);
    put.mockResolvedValue({});
    const { result } = renderHook(() => useWidgetBroadcast("c1", "shop:1"), { wrapper });
    act(() => result.current.stop());
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put).toHaveBeenCalledWith("/api/campaigns/c1/broadcasts/shop%3A1", {
      active: false,
      payload: undefined,
    });
  });

  it("is a no-op without a broadcast key", async () => {
    get.mockResolvedValue([]);
    const { result } = renderHook(() => useWidgetBroadcast("c1", undefined), { wrapper });
    act(() => result.current.share({ x: 1 }));
    act(() => result.current.stop());
    expect(put).not.toHaveBeenCalled();
  });
});
