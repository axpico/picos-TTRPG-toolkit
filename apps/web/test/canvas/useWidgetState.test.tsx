import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWidgetState } from "../../src/canvas/useWidgetState.js";

describe("useWidgetState", () => {
  it("returns the defaults when no state is persisted", () => {
    const setState = vi.fn();
    const { result } = renderHook(() =>
      useWidgetState({ state: undefined, setState }, { tab: "library", count: 0 }),
    );
    expect(result.current[0]).toEqual({ tab: "library", count: 0 });
  });

  it("overlays persisted state on top of the defaults", () => {
    const setState = vi.fn();
    const { result } = renderHook(() =>
      useWidgetState({ state: { tab: "generator" }, setState }, { tab: "library", count: 0 }),
    );
    expect(result.current[0]).toEqual({ tab: "generator", count: 0 });
  });

  it("patch forwards a partial patch to setState", () => {
    const setState = vi.fn();
    const { result } = renderHook(() =>
      useWidgetState({ state: {}, setState }, { tab: "library" as "library" | "generator" }),
    );
    act(() => result.current[1]({ tab: "generator" }));
    expect(setState).toHaveBeenCalledWith({ tab: "generator" });
  });
});
