import { describe, it, expect } from "vitest";
import { splitMemberships, roleIn } from "../../src/auth/useAuth.js";
import type { Membership } from "@toolkit/shared";

const memberships: Membership[] = [
  { campaignId: "a", role: "dm" },
  { campaignId: "b", role: "player" },
  { campaignId: "c", role: "dm" },
];

describe("splitMemberships", () => {
  it("separates campaigns by role", () => {
    const { running, playing } = splitMemberships(memberships);
    expect(running).toEqual(["a", "c"]);
    expect(playing).toEqual(["b"]);
  });

  it("handles undefined", () => {
    expect(splitMemberships(undefined)).toEqual({ running: [], playing: [] });
  });
});

describe("roleIn", () => {
  it("returns the role for a campaign, or undefined", () => {
    expect(roleIn(memberships, "a")).toBe("dm");
    expect(roleIn(memberships, "b")).toBe("player");
    expect(roleIn(memberships, "zzz")).toBeUndefined();
    expect(roleIn(undefined, "a")).toBeUndefined();
  });
});
