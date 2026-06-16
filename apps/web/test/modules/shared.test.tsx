import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HpBar, InlineConfirm, LibraryCopyButton } from "../../src/modules/shared.js";

afterEach(cleanup);

describe("HpBar", () => {
  it("renders nothing when there is no max HP", () => {
    const { container } = render(<HpBar hp={5} hpMax={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("uses the emerald band when above 60%", () => {
    const { container } = render(<HpBar hp={8} hpMax={10} />);
    expect(container.querySelector(".h-full")?.className).toContain("bg-emerald-500");
  });

  it("uses the amber band in the middle range", () => {
    const { container } = render(<HpBar hp={5} hpMax={10} />);
    expect(container.querySelector(".h-full")?.className).toContain("bg-amber-500");
  });

  it("uses the red band when low", () => {
    const { container } = render(<HpBar hp={2} hpMax={10} />);
    expect(container.querySelector(".h-full")?.className).toContain("bg-red-500");
  });
});

describe("InlineConfirm", () => {
  it("requires a confirm step before firing onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<InlineConfirm onConfirm={onConfirm} />);

    // First click opens the confirm prompt; onConfirm not called yet.
    await user.click(screen.getByTitle("Delete"));
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByText("Yes"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("clicking No cancels without firing onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<InlineConfirm onConfirm={onConfirm} title="Remove" />);

    await user.click(screen.getByTitle("Remove"));
    await user.click(screen.getByText("No"));
    expect(onConfirm).not.toHaveBeenCalled();
    // The trigger button is back.
    expect(screen.getByTitle("Remove")).toBeTruthy();
  });
});

describe("LibraryCopyButton", () => {
  it("imports a library entry into the campaign", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(
      <LibraryCopyButton
        isLibrary
        sameCampaign={false}
        campaignId="camp-1"
        onCopy={onCopy}
        noun="creature"
      />,
    );

    const btn = screen.getByLabelText("Import creature into campaign");
    expect(btn.textContent).toContain("Import");
    await user.click(btn);
    expect(onCopy).toHaveBeenCalledWith("camp-1");
  });

  it("publishes a campaign entry to the shared library", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(
      <LibraryCopyButton
        isLibrary={false}
        sameCampaign
        campaignId="camp-1"
        onCopy={onCopy}
        noun="spell"
      />,
    );

    const btn = screen.getByLabelText("Publish spell to library");
    expect(btn.textContent).toContain("Publish");
    await user.click(btn);
    expect(onCopy).toHaveBeenCalledWith(undefined);
  });

  it("renders nothing for an entry in neither scope", () => {
    const { container } = render(
      <LibraryCopyButton
        isLibrary={false}
        sameCampaign={false}
        campaignId="camp-1"
        onCopy={vi.fn()}
        noun="NPC"
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
