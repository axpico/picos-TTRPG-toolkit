import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ErrorBoundary } from "../../src/components/ErrorBoundary.js";

afterEach(cleanup);

function Bomb(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>safe content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe content")).toBeTruthy();
  });

  it("renders the default fallback when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    spy.mockRestore();
  });

  it("renders a custom fallback when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom fallback")).toBeTruthy();
    spy.mockRestore();
  });
});
