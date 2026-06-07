import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/sessions/api.js", () => ({
  useSessions: () => ({ data: [] }),
  useSession: () => ({ data: undefined }),
  useCreateSession: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateSession: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSession: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../../../src/modules/broadcast/api.js", () => ({
  useBroadcasts: () => ({ data: [] }),
  useSetBroadcast: () => ({ mutate: vi.fn(), isPending: false }),
  useSetBroadcasts: () => ({ mutate: vi.fn(), isPending: false }),
  useWidgetBroadcast: () => ({ active: false, payload: {}, share: vi.fn(), stop: vi.fn(), isPending: false }),
  usePresence: () => ({ data: { count: 0 } }),
}));

await import("../../../src/modules/sessions/Widget.js");
const SessionsWidget = getWidget("sessions")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("SessionsWidget", () => {
  it("prompts to select or create a session when none is open", () => {
    render(<SessionsWidget {...ctx} />);
    expect(screen.getByText(/No session selected/i)).toBeTruthy();
  });
});
