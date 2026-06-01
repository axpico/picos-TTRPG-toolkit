import { describe, it, expect } from "vitest";
import { parseBreakdown } from "../../../src/modules/dice/format.js";

describe("parseBreakdown", () => {
  it("renders a single roll term with rolls and sum", () => {
    const json = JSON.stringify([{ kind: "roll", count: 2, sides: 6, rolls: [3, 5] }]);
    expect(parseBreakdown(json)).toBe("2d6 [3+5=8]");
  });

  it("renders a positive constant without a leading plus once joined", () => {
    const json = JSON.stringify([{ kind: "const", value: 4 }]);
    // Leading "+" is stripped for the first term.
    expect(parseBreakdown(json)).toBe("4");
  });

  it("renders a negative constant", () => {
    const json = JSON.stringify([
      { kind: "roll", count: 1, sides: 20, rolls: [11] },
      { kind: "const", value: -2 },
    ]);
    expect(parseBreakdown(json)).toBe("1d20 [11=11] -2");
  });

  it("combines roll and positive constant terms", () => {
    const json = JSON.stringify([
      { kind: "roll", count: 1, sides: 8, rolls: [6] },
      { kind: "const", value: 3 },
    ]);
    expect(parseBreakdown(json)).toBe("1d8 [6=6] +3");
  });

  it("returns the raw string on malformed JSON", () => {
    expect(parseBreakdown("not json")).toBe("not json");
  });
});
