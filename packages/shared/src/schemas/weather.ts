import { z } from "zod";

export const weatherState = z.object({
  condition: z.string(),
  temperature: z.string(),
  description: z.string(),
});
export type WeatherState = z.infer<typeof weatherState>;

export const weatherTableEntry = z.object({
  weight: z.number().int().min(1).max(1000),
  condition: z.string().min(1).max(60),
  temperature: z.string().min(1).max(60),
  description: z.string().min(1).max(500),
});
export type WeatherTableEntry = z.infer<typeof weatherTableEntry>;

export const weather = z.object({
  id: z.string(),
  campaignId: z.string(),
  current: weatherState,
  table: z.array(weatherTableEntry).nullable(),
});
export type Weather = z.infer<typeof weather>;

export const setWeatherInput = z.object({
  current: weatherState.optional(),
  table: z.array(weatherTableEntry).nullable().optional(),
});
export type SetWeatherInput = z.infer<typeof setWeatherInput>;

/** A quick-set weather preset: an emoji plus the state it applies. */
export interface WeatherPreset {
  icon: string;
  condition: string;
  temperature: string;
  description: string;
}

export const WEATHER_PRESETS: WeatherPreset[] = [
  { icon: "☀️", condition: "Clear", temperature: "Mild", description: "Open skies." },
  { icon: "⛅", condition: "Cloudy", temperature: "Cool", description: "Layered grey overhead." },
  { icon: "🌧️", condition: "Rain", temperature: "Cool", description: "Steady, soaking rain." },
  { icon: "⛈️", condition: "Storm", temperature: "Cold", description: "Wind-driven downpour, distant thunder." },
  { icon: "🌫️", condition: "Fog", temperature: "Chilled", description: "Visibility drops to a stone's throw." },
  { icon: "❄️", condition: "Snow", temperature: "Freezing", description: "Soft, steady snowfall." },
  { icon: "🌬️", condition: "Windy", temperature: "Brisk", description: "Strong gusts kick up dust and debris." },
  { icon: "🔥", condition: "Heatwave", temperature: "Sweltering", description: "Oppressive, shimmering heat." },
];

/** Pick an emoji for a weather condition by keyword (falls back to a thermometer). */
export function weatherIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (/(storm|thunder|lightning)/.test(c)) return "⛈️";
  if (/(snow|blizzard|sleet)/.test(c)) return "❄️";
  if (/(rain|drizzle|shower|downpour)/.test(c)) return "🌧️";
  if (/(fog|mist|haze)/.test(c)) return "🌫️";
  if (/(wind|gale|gust)/.test(c)) return "🌬️";
  if (/(heat|scorch|swelter)/.test(c)) return "🔥";
  if (/(cloud|overcast)/.test(c)) return "⛅";
  if (/(clear|sun|fair)/.test(c)) return "☀️";
  return "🌡️";
}
