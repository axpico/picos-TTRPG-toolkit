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
