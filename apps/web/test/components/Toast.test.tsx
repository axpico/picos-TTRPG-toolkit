import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "../../src/components/Toast.js";

afterEach(cleanup);

function Harness() {
  const toast = useToast();
  return <button onClick={() => toast("Saved!", "success")}>fire</button>;
}

describe("Toast", () => {
  it("shows a message and auto-dismisses after the timeout", () => {
    vi.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Harness />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByText("fire"));
      expect(screen.getByText("Saved!")).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(3100);
      });
      expect(screen.queryByText("Saved!")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
