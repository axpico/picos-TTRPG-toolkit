import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EmptyState } from "../../src/components/EmptyState.js";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(<EmptyState title="Nothing here" description="Add something." />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
    expect(screen.getByText("Add something.")).toBeTruthy();
  });

  it("renders an action when provided", () => {
    render(<EmptyState title="Empty" action={<button>Do it</button>} />);
    expect(screen.getByText("Do it")).toBeTruthy();
  });
});
