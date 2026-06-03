import { describe, it, expect } from "vitest";
import { weatherIcon, WEATHER_PRESETS } from "@toolkit/shared";

describe("weatherIcon", () => {
  it("matches conditions by keyword, case-insensitively", () => {
    expect(weatherIcon("Thunderstorm")).toBe("⛈️");
    expect(weatherIcon("light SNOW")).toBe("❄️");
    expect(weatherIcon("Heavy rain")).toBe("🌧️");
    expect(weatherIcon("Dense fog")).toBe("🌫️");
    expect(weatherIcon("Strong winds")).toBe("🌬️");
    expect(weatherIcon("Clear skies")).toBe("☀️");
    expect(weatherIcon("Overcast")).toBe("⛅");
  });

  it("falls back to a thermometer for unknown conditions", () => {
    expect(weatherIcon("Eldritch miasma")).toBe("🌡️");
    expect(weatherIcon("")).toBe("🌡️");
  });

  it("every preset resolves to its own icon", () => {
    for (const p of WEATHER_PRESETS) {
      expect(weatherIcon(p.condition)).toBe(p.icon);
    }
  });
});
