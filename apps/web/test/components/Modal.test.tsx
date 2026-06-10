import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { Modal } from "../../src/components/Modal.js";

afterEach(cleanup);

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>hidden</p>
      </Modal>,
    );
    expect(screen.queryByText("hidden")).toBeNull();
  });

  it("has dialog semantics", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>content</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>content</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the dialog on open", () => {
    render(
      <Modal open onClose={() => {}}>
        <button>First action</button>
      </Modal>,
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First action" }));
  });

  it("returns focus to the previously focused element on close", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open modal</button>
          <Modal open={open} onClose={() => setOpen(false)}>
            <button onClick={() => setOpen(false)}>Close modal</button>
          </Modal>
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open modal" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(document.activeElement).toBe(opener);
  });

  it("wraps Tab from the last to the first focusable element", () => {
    render(
      <Modal open onClose={() => {}}>
        <button>One</button>
        <button>Two</button>
      </Modal>,
    );
    const two = screen.getByRole("button", { name: "Two" });
    two.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "One" }));
  });
});
