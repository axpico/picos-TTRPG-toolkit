import { describe, it, expect } from "vitest";
import type { Timer } from "@toolkit/shared";
import { formatDuration, isRunning, remainingSeconds } from "../../../src/modules/timers/util.js";

function makeTimer(patch: Partial<Timer> = {}): Timer {
  return {
    id: "t1",
    campaignId: "camp",
    name: "Turn",
    durationSeconds: 300,
    endsAt: null,
    remainingSeconds: 300,
    color: "#ef4444",
    secret: false,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

describe("formatDuration", () => {
  it("formats sub-hour times as M:SS", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(600)).toBe("10:00");
  });

  it("formats hour-plus times as H:MM:SS", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("clamps negatives to zero", () => {
    expect(formatDuration(-10)).toBe("0:00");
  });
});

describe("isRunning", () => {
  it("is running only when endsAt is set", () => {
    expect(isRunning(makeTimer({ endsAt: null }))).toBe(false);
    expect(isRunning(makeTimer({ endsAt: "2026-01-01T00:05:00.000Z" }))).toBe(true);
  });
});

describe("remainingSeconds", () => {
  it("returns the frozen value when paused/idle", () => {
    expect(remainingSeconds(makeTimer({ endsAt: null, remainingSeconds: 42 }), Date.now())).toBe(42);
  });

  it("computes live remaining from endsAt while running", () => {
    const now = 1_000_000_000_000;
    const endsAt = new Date(now + 90_000).toISOString(); // 90s out
    expect(remainingSeconds(makeTimer({ endsAt }), now)).toBe(90);
  });

  it("never goes below zero once endsAt has passed", () => {
    const now = 1_000_000_000_000;
    const endsAt = new Date(now - 5_000).toISOString();
    expect(remainingSeconds(makeTimer({ endsAt }), now)).toBe(0);
  });
});
