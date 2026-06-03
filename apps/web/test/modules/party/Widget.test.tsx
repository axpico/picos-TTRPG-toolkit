import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/party/api.js", () => ({
  useParty: () => ({ data: [] }),
  useCreatePartyMember: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePartyMember: () => ({ mutate: vi.fn(), isPending: false }),
  useDeletePartyMember: () => ({ mutate: vi.fn(), isPending: false }),
}));

await import("../../../src/modules/party/Widget.js");
const PartyWidget = getWidget("party")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("PartyWidget", () => {
  it("is registered", () => {
    expect(getWidget("party")).toBeTruthy();
  });

  it("mounts with an empty party without crashing", () => {
    expect(() => render(<PartyWidget {...ctx} />)).not.toThrow();
  });
});
