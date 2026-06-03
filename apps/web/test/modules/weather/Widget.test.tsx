import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

vi.mock("../../../src/modules/weather/api.js", () => ({
  useWeather: () => ({ data: null }),
  useSetWeather: () => ({ mutate: vi.fn(), isPending: false }),
  useRollWeather: () => ({ mutate: vi.fn(), isPending: false }),
}));

await import("../../../src/modules/weather/Widget.js");
const WeatherWidget = getWidget("weather")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

afterEach(cleanup);

describe("WeatherWidget", () => {
  it("is registered as a broadcastable widget", () => {
    expect(getWidget("weather")!.broadcastKey).toBe("weather");
  });

  it("mounts before weather data has loaded without crashing", () => {
    expect(() => render(<WeatherWidget {...ctx} />)).not.toThrow();
  });
});
