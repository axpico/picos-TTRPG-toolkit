import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { LayoutItem } from "@toolkit/shared";

// Capture the props handed to react-rnd so lock behavior is assertable.
const h = vi.hoisted(() => ({ rndProps: null as Record<string, unknown> | null }));

vi.mock("react-rnd", () => ({
  Rnd: ({ children, ...props }: { children?: React.ReactNode }) => {
    h.rndProps = props;
    return <div data-testid="rnd">{children}</div>;
  },
}));

vi.mock("../../src/modules/broadcast/BroadcastToggle.js", () => ({
  BroadcastToggle: () => <span data-testid="broadcast-toggle" />,
}));

vi.mock("../../src/canvas/WidgetRegistry.js", () => ({
  getWidget: (type: string) =>
    type === "dice"
      ? {
          type: "dice",
          title: "Dice Roller",
          defaultSize: { w: 300, h: 300 },
          broadcastKey: "dice",
          Component: () => <div data-testid="widget-body" />,
        }
      : undefined,
}));

const { Widget } = await import("../../src/canvas/Widget.js");
const { useCanvasStore } = await import("../../src/canvas/store.js");

function item(over: Partial<LayoutItem>): LayoutItem {
  return { instanceId: "i1", moduleType: "dice", x: 0, y: 0, w: 300, h: 300, state: {}, ...over };
}

beforeEach(() => {
  h.rndProps = null;
  useCanvasStore.setState({ locked: false });
});
afterEach(cleanup);

describe("Widget", () => {
  it("renders the title with a tooltip and an accessible close button", () => {
    render(<Widget campaignId="camp" item={item({})} />);
    const title = screen.getByText("Dice Roller");
    expect(title.getAttribute("title")).toBe("Dice Roller");
    expect(screen.getByRole("button", { name: "Close Dice Roller widget" })).toBeTruthy();
    expect(screen.getByTestId("widget-body")).toBeTruthy();
  });

  it("removes the layout item when the close button is clicked", () => {
    useCanvasStore.setState({
      layout: { ...useCanvasStore.getState().layout, items: [item({})] },
    });
    render(<Widget campaignId="camp" item={item({})} />);
    fireEvent.click(screen.getByRole("button", { name: "Close Dice Roller widget" }));
    expect(useCanvasStore.getState().layout.items).toHaveLength(0);
  });

  it("renders a fallback frame for unknown widget types", () => {
    render(<Widget campaignId="camp" item={item({ moduleType: "mystery" })} />);
    expect(screen.getByText(/No widget registered for type "mystery"/)).toBeTruthy();
  });

  it("passes drag/resize lock state down to react-rnd", () => {
    render(<Widget campaignId="camp" item={item({})} />);
    expect(h.rndProps?.disableDragging).toBe(false);
    expect(h.rndProps?.enableResizing).toBe(true);

    cleanup();
    useCanvasStore.setState({ locked: true });
    render(<Widget campaignId="camp" item={item({})} />);
    expect(h.rndProps?.disableDragging).toBe(true);
    expect(h.rndProps?.enableResizing).toBe(false);
  });
});
