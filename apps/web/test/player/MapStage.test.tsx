import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { PublicLocation } from "@toolkit/shared";

vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TransformComponent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../src/modules/map/TokenView.js", () => ({
  TokenView: ({ token }: { token: { id: string } }) => <div data-testid={`token-${token.id}`} />,
  GridOverlay: () => <div data-testid="grid-overlay" />,
}));

const { MapStage } = await import("../../src/player/MapStage.js");

afterEach(cleanup);

function loc(over: Partial<PublicLocation>): PublicLocation {
  return {
    id: "l1",
    name: "Crypt",
    description: null,
    playerNotes: null,
    imageUrl: "/api/files/img1",
    pins: [],
    reveals: [],
    tokens: [],
    grid: null,
    ...over,
  };
}

describe("MapStage", () => {
  it("shows a fallback when there is no image", () => {
    render(<MapStage map={loc({ imageUrl: null })} />);
    expect(screen.getByText("No map image.")).toBeTruthy();
  });

  it("renders player notes and the map name", () => {
    render(<MapStage map={loc({ playerNotes: "Beware the well" })} />);
    expect(screen.getByText("Crypt")).toBeTruthy();
    expect(screen.getByText("Beware the well")).toBeTruthy();
  });

  it("renders the fog mask only when reveals exist", () => {
    const { container, rerender } = render(<MapStage map={loc({})} />);
    expect(container.querySelector("mask#fog-mask")).toBeNull();
    rerender(
      <MapStage
        map={loc({ reveals: [{ id: "r1", x: 0.1, y: 0.1, w: 0.2, h: 0.2, mode: "reveal" }] })}
      />,
    );
    expect(container.querySelector("mask#fog-mask")).toBeTruthy();
  });

  it("renders pins with labels and tokens", () => {
    render(
      <MapStage
        map={loc({
          pins: [{ id: "p1", x: 0.5, y: 0.5, color: "#fff", label: "Entrance", playerVisible: true }],
          tokens: [{ id: "t1" } as PublicLocation["tokens"][number]],
        })}
      />,
    );
    expect(screen.getByText("Entrance")).toBeTruthy();
    expect(screen.getByTestId("token-t1")).toBeTruthy();
  });
});
