import { z } from "zod";
import {
  weatherState,
  weatherTableEntry,
  type Weather as WeatherDto,
  type WeatherState,
  type WeatherTableEntry,
} from "@toolkit/shared";
import type { Weather as DbWeather } from "@prisma/client";
import { parseJsonField } from "../json.js";

const DEFAULT_CURRENT: WeatherState = {
  condition: "Clear",
  temperature: "Mild",
  description: "Open skies, a soft breeze.",
};

const tableSchema = z.array(weatherTableEntry);

export function toWeatherDto(row: DbWeather): WeatherDto {
  const current = parseJsonField<WeatherState>(row.currentJson, weatherState, DEFAULT_CURRENT);
  const table = row.tableJson
    ? parseJsonField<WeatherTableEntry[] | null>(
        row.tableJson,
        tableSchema.nullable(),
        null,
      )
    : null;
  return {
    id: row.id,
    campaignId: row.campaignId,
    current,
    table,
  };
}
