import { describe, it, expect, afterEach, vi } from "vitest";
import { copyText } from "../../src/lib/clipboard.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("copyText", () => {
  it("uses navigator.clipboard in secure contexts", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("isSecureContext", true);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    expect(await copyText("hello")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when the Clipboard API is unavailable", async () => {
    vi.stubGlobal("isSecureContext", false);
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(true);
    expect(await copyText("join-code")).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("returns false when both strategies fail", async () => {
    vi.stubGlobal("isSecureContext", false);
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    document.execCommand = vi.fn(() => {
      throw new Error("denied");
    });
    expect(await copyText("nope")).toBe(false);
  });
});
