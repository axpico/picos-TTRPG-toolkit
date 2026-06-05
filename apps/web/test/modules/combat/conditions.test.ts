import { describe, it, expect } from "vitest";
import { CONDITIONS } from "../../../src/modules/combat/conditions.js";

describe("CONDITIONS", () => {
  it("lists the 15 standard 5e conditions", () => {
    expect(CONDITIONS).toHaveLength(15);
    expect(CONDITIONS).toContain("Prone");
    expect(CONDITIONS).toContain("Unconscious");
    expect(CONDITIONS).toContain("Exhaustion");
  });

  it("has no duplicates", () => {
    expect(new Set(CONDITIONS).size).toBe(CONDITIONS.length);
  });
});
