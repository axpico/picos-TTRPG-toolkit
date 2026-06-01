import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmProvider, useConfirm } from "../../src/components/ConfirmDialog.js";

afterEach(cleanup);

function Harness({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button onClick={async () => onResult(await confirm({ title: "Delete it?", confirmLabel: "Delete" }))}>
      ask
    </button>
  );
}

describe("ConfirmDialog", () => {
  it("resolves true when confirmed", async () => {
    const user = userEvent.setup();
    let result: boolean | undefined;
    render(
      <ConfirmProvider>
        <Harness onResult={(v) => (result = v)} />
      </ConfirmProvider>,
    );
    await user.click(screen.getByText("ask"));
    expect(screen.getByText("Delete it?")).toBeTruthy();
    await user.click(screen.getByText("Delete"));
    expect(result).toBe(true);
  });

  it("resolves false when cancelled", async () => {
    const user = userEvent.setup();
    let result: boolean | undefined;
    render(
      <ConfirmProvider>
        <Harness onResult={(v) => (result = v)} />
      </ConfirmProvider>,
    );
    await user.click(screen.getByText("ask"));
    await user.click(screen.getByText("Cancel"));
    expect(result).toBe(false);
  });
});
