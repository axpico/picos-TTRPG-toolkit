import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Tabs } from "../../src/modules/shared.js";

afterEach(cleanup);

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
] as const;

describe("Tabs", () => {
  it("marks the active tab as selected", () => {
    render(<Tabs value="a" onChange={() => {}} options={options} />);
    expect(screen.getByRole("tab", { name: "Alpha" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Beta" }).getAttribute("aria-selected")).toBe("false");
  });

  it("fires onChange with the clicked tab's value", () => {
    const onChange = vi.fn();
    render(<Tabs value="a" onChange={onChange} options={options} />);
    fireEvent.click(screen.getByRole("tab", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
