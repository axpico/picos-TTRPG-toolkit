import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DEFAULT_WEATHER_TABLE } from "@toolkit/shared";
import { getWidget } from "../../../src/canvas/WidgetRegistry.js";

const h = vi.hoisted(() => ({
  data: null as unknown,
  setMutate: vi.fn(),
}));

vi.mock("../../../src/modules/weather/api.js", () => ({
  useWeather: () => ({ data: h.data }),
  useSetWeather: () => ({ mutate: h.setMutate, isPending: false }),
  useRollWeather: () => ({ mutate: vi.fn(), isPending: false }),
}));

await import("../../../src/modules/weather/Widget.js");
const WeatherWidget = getWidget("weather")!.Component;

const ctx = { campaignId: "camp", instanceId: "i1", state: undefined, setState: () => {} };

const weather = (table: unknown = null) => ({
  id: "w1",
  campaignId: "camp",
  current: { condition: "Clear", temperature: "Mild", description: "Open skies." },
  table,
});

beforeEach(() => {
  h.data = null;
  h.setMutate = vi.fn();
});
afterEach(cleanup);

function openTableEditor() {
  render(<WeatherWidget {...ctx} />);
  fireEvent.click(screen.getByRole("button", { name: /Edit roll table/ }));
}

describe("WeatherWidget", () => {
  it("is registered as a broadcastable widget", () => {
    expect(getWidget("weather")!.broadcastKey).toBe("weather");
  });

  it("mounts before weather data has loaded without crashing", () => {
    expect(() => render(<WeatherWidget {...ctx} />)).not.toThrow();
  });

  it("seeds the editor with the built-in table for customization", () => {
    h.data = weather(null);
    openTableEditor();
    fireEvent.click(screen.getByRole("button", { name: /Customize the default table/ }));
    expect(h.setMutate).toHaveBeenCalledWith({ table: DEFAULT_WEATHER_TABLE });
  });

  it("quick-adds a preset as a table row", () => {
    h.data = weather([]);
    openTableEditor();
    fireEvent.click(screen.getByRole("button", { name: "Add Snow to the table" }));
    expect(h.setMutate).toHaveBeenCalledWith({
      table: [
        {
          weight: 1,
          condition: "Snow",
          temperature: "Freezing",
          description: "Soft, steady snowfall.",
        },
      ],
    });
  });

  it("sets a complete row as the current weather", () => {
    h.data = weather([
      { weight: 2, condition: "Ashfall", temperature: "Hot", description: "Grey flakes drift down." },
    ]);
    openTableEditor();
    fireEvent.click(screen.getByRole("button", { name: "Set Ashfall as current weather" }));
    expect(h.setMutate).toHaveBeenCalledWith({
      current: { condition: "Ashfall", temperature: "Hot", description: "Grey flakes drift down." },
    });
  });

  it("clears the table via Reset to default", () => {
    h.data = weather([
      { weight: 1, condition: "Rain", temperature: "Cool", description: "Steady rain." },
    ]);
    openTableEditor();
    fireEvent.click(screen.getByRole("button", { name: /Reset to default/ }));
    expect(h.setMutate).toHaveBeenCalledWith({ table: null });
  });
});
