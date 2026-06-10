import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { useSectionChanges, HIGHLIGHT_MS } from "../../src/player/useSectionChanges.js";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useSectionChanges", () => {
  it("flags nothing on the first snapshot", () => {
    const { result } = renderHook(() => useSectionChanges({ a: 1, b: "x" }));
    expect(result.current.size).toBe(0);
  });

  it("flags only the slice that changed", () => {
    const { result, rerender } = renderHook((props) => useSectionChanges(props), {
      initialProps: { a: 1, b: "x" } as Record<string, unknown>,
    });
    rerender({ a: 2, b: "x" });
    expect([...result.current]).toEqual(["a"]);
  });

  it("clears the flag after the highlight window", () => {
    const { result, rerender } = renderHook((props) => useSectionChanges(props), {
      initialProps: { a: 1 } as Record<string, unknown>,
    });
    rerender({ a: 2 });
    expect(result.current.has("a")).toBe(true);
    act(() => void vi.advanceTimersByTime(HIGHLIGHT_MS + 50));
    expect(result.current.has("a")).toBe(false);
  });

  it("flags slices that appear (null → value)", () => {
    const { result, rerender } = renderHook((props) => useSectionChanges(props), {
      initialProps: { combat: null } as Record<string, unknown>,
    });
    rerender({ combat: { round: 1 } });
    expect(result.current.has("combat")).toBe(true);
  });

  it("does not flag deep-equal re-creations", () => {
    const { result, rerender } = renderHook((props) => useSectionChanges(props), {
      initialProps: { a: { x: 1 } } as Record<string, unknown>,
    });
    rerender({ a: { x: 1 } });
    expect(result.current.size).toBe(0);
  });
});
