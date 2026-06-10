import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PendingButton } from "../../src/modules/shared.js";
import { EmptyState } from "../../src/components/EmptyState.js";

afterEach(cleanup);

describe("PendingButton", () => {
  it("renders an enabled button by default", () => {
    const onClick = vi.fn();
    render(<PendingButton onClick={onClick}>Save</PendingButton>);
    const btn = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });

  it("disables itself and sets aria-busy while pending", () => {
    render(<PendingButton pending>Save</PendingButton>);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute("aria-busy")).toBe("true");
  });

  it("respects an explicit disabled prop", () => {
    render(<PendingButton disabled>Save</PendingButton>);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("EmptyState compact", () => {
  it("uses tighter padding in compact mode", () => {
    const { container, rerender } = render(<EmptyState title="Nothing here" />);
    expect(container.firstElementChild?.className).toContain("py-12");
    rerender(<EmptyState compact title="Nothing here" />);
    expect(container.firstElementChild?.className).toContain("py-6");
  });
});
