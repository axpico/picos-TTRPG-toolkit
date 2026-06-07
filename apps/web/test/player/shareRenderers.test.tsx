import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getShareRenderer } from "../../src/player/shareRenderers.js";

// The generic share engine looks up a player-view renderer per widget type and
// falls back to a generic card for unknown types, so a new widget is live the
// moment it has a server projector — even before a bespoke renderer exists.

afterEach(cleanup);

describe("share renderer registry", () => {
  it("returns a registered renderer that draws player-safe data", () => {
    const Npc = getShareRenderer("npc");
    render(
      <Npc
        widgetKey="npc"
        data={{ name: "Sera", role: "Innkeeper", quirk: null, tags: ["town"], portraitAssetId: null }}
      />,
    );
    expect(screen.getByText("Sera")).toBeTruthy();
    expect(screen.getByText("Innkeeper")).toBeTruthy();
    expect(screen.getByText("town")).toBeTruthy();
  });

  it("falls back to a generic card for an unregistered type", () => {
    const Fallback = getShareRenderer("brand-new-widget");
    render(<Fallback widgetKey="brand-new-widget:abc" data={{}} />);
    // Fallback names the shared widget type (prefix before the instance suffix).
    expect(screen.getByText(/brand-new-widget/)).toBeTruthy();
  });
});
