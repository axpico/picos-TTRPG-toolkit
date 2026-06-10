import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useBroadcast, type ConnectionStatus } from "../../src/hooks/useBroadcast.js";

/** Minimal EventSource stand-in; jsdom has none. Tests drive it manually. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  listeners = new Map<string, EventListener[]>();
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, fn: EventListener) {
    const arr = this.listeners.get(type) ?? [];
    arr.push(fn);
    this.listeners.set(type, arr);
  }
  removeEventListener(type: string, fn: EventListener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((f) => f !== fn));
  }
  close() {
    this.closed = true;
  }
  emit(type: string, payload: unknown) {
    const ev = { data: JSON.stringify(payload) } as MessageEvent;
    for (const fn of this.listeners.get(type) ?? []) fn(ev as unknown as Event);
  }
}

let qc: QueryClient;
const statuses: ConnectionStatus[] = [];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function mount(campaignId = "camp") {
  return renderHook(
    () =>
      useBroadcast({
        url: `/api/stream/${campaignId}`,
        campaignId,
        onStatus: (s) => statuses.push(s),
      }),
    { wrapper },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeEventSource.instances = [];
  statuses.length = 0;
  qc = new QueryClient();
  vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useBroadcast", () => {
  it("reports live on open", () => {
    mount();
    const src = FakeEventSource.instances[0]!;
    act(() => src.onopen?.());
    expect(statuses).toEqual(["live"]);
  });

  it("invalidates the family key plus the player key on events", () => {
    mount();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const src = FakeEventSource.instances[0]!;
    act(() => src.emit("dice.roll", { type: "dice.roll" }));
    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys).toContain(JSON.stringify(["dice", "camp"]));
    expect(keys).toContain(JSON.stringify(["player", "camp"]));
  });

  it("invalidates broadcasts and player keys on broadcast.change", () => {
    mount();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const src = FakeEventSource.instances[0]!;
    act(() => src.emit("broadcast.change", { type: "broadcast.change" }));
    const keys = spy.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys).toContain(JSON.stringify(["broadcasts", "camp"]));
    expect(keys).toContain(JSON.stringify(["player", "camp"]));
  });

  it("reconnects with backoff after an error", () => {
    mount();
    const first = FakeEventSource.instances[0]!;
    act(() => first.onerror?.());
    expect(statuses).toEqual(["reconnecting"]);
    expect(first.closed).toBe(true);

    // Backoff is jittered but capped at 1s for the first retry.
    act(() => void vi.advanceTimersByTime(1_100));
    expect(FakeEventSource.instances).toHaveLength(2);
    act(() => FakeEventSource.instances[1]!.onopen?.());
    expect(statuses).toEqual(["reconnecting", "live"]);
  });

  it("closes the source and stops retrying on unmount", () => {
    const { unmount } = mount();
    const src = FakeEventSource.instances[0]!;
    unmount();
    expect(src.closed).toBe(true);
    act(() => void vi.advanceTimersByTime(60_000));
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});
