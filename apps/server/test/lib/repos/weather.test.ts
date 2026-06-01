import { test } from "node:test";
import assert from "node:assert/strict";
import type { Weather as DbWeather } from "@prisma/client";
import { toWeatherDto } from "../../../src/lib/repos/weather.js";

const weather = (over: Partial<DbWeather> = {}): DbWeather => ({
  id: "w",
  campaignId: "camp",
  currentJson: JSON.stringify({ condition: "Rain", temperature: "Cold", description: "Drizzle." }),
  tableJson: null,
  ...over,
});

test("parses the current weather state", () => {
  const dto = toWeatherDto(weather());
  assert.equal(dto.current.condition, "Rain");
  assert.equal(dto.current.temperature, "Cold");
});

test("falls back to a default current state on malformed JSON", () => {
  const dto = toWeatherDto(weather({ currentJson: "broken" }));
  assert.equal(dto.current.condition, "Clear");
});

test("table is null when not set", () => {
  assert.equal(toWeatherDto(weather()).table, null);
});

test("parses a weather table when present", () => {
  const table = [{ weight: 1, condition: "Fog", temperature: "Cool", description: "Thick fog." }];
  const dto = toWeatherDto(weather({ tableJson: JSON.stringify(table) }));
  assert.equal(dto.table?.length, 1);
  assert.equal(dto.table?.[0]?.condition, "Fog");
});
