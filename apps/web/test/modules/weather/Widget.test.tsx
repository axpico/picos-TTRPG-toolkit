import { useState } from "react";
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

/** Renders the widget with working per-widget state so tab clicks take effect. */
function Harness() {
  const [state, setState] = useState<Record<string, unknown> | undefined>(undefined);
  return (
    <WeatherWidget
      {...ctx}
      state={state}
      setState={(patch) => setState((s) => ({ ...(s ?? {}), ...patch }))}
    />
  );
}

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

function openTableTab() {
  const view = render(<Harness />);
  fireEvent.click(screen.getByRole("tab", { name: "Roll table" }));
  return view;
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
    openTableTab();
    fireEvent.click(screen.getByRole("button", { name: /Customize the default table/ }));
    expect(h.setMutate).toHaveBeenCalledWith({ table: DEFAULT_WEATHER_TABLE });
  });

  it("quick-adds a preset as a table row", () => {
    h.data = weather([]);
    openTableTab();
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
    openTableTab();
    fireEvent.click(screen.getByRole("button", { name: "Set Ashfall as current weather" }));
    expect(h.setMutate).toHaveBeenCalledWith({
      current: { condition: "Ashfall", temperature: "Hot", description: "Grey flakes drift down." },
    });
  });

  it("clears the table via Reset to default", () => {
    h.data = weather([
      { weight: 1, condition: "Rain", temperature: "Cool", description: "Steady rain." },
    ]);
    openTableTab();
    fireEvent.click(screen.getByRole("button", { name: /Reset to default/ }));
    expect(h.setMutate).toHaveBeenCalledWith({ table: null });
  });

  it("keeps draft rows when the table changes server-side", () => {
    h.data = weather([]);
    const { rerender } = openTableTab();
    fireEvent.click(screen.getByRole("button", { name: "+ Custom row" }));
    // Adding an empty draft must not persist anything.
    expect(h.setMutate).not.toHaveBeenCalled();

    h.data = weather([
      { weight: 1, condition: "Rain", temperature: "Cool", description: "Steady rain." },
    ]);
    rerender(<Harness />);

    const conditions = screen.getAllByPlaceholderText("Condition");
    expect(conditions.map((i) => (i as HTMLInputElement).value)).toEqual(["Rain", ""]);
  });

  it("keeps an in-flight edit when an unrelated field changes server-side", () => {
    h.data = weather(null);
    const { rerender } = render(<WeatherWidget {...ctx} />);

    const description = screen.getByPlaceholderText(/Describe the scene/);
    fireEvent.change(description, { target: { value: "typing…" } });

    h.data = {
      ...weather(null),
      current: { condition: "Storm", temperature: "Mild", description: "Open skies." },
    };
    rerender(<WeatherWidget {...ctx} />);

    expect((description as HTMLTextAreaElement).value).toBe("typing…");
    expect(
      (screen.getByPlaceholderText("Condition (e.g. Rain)") as HTMLInputElement).value,
    ).toBe("Storm");
  });
});
