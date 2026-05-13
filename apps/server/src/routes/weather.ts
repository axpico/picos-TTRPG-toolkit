import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { setWeatherInput, type WeatherTableEntry } from "@toolkit/shared";
import { prisma } from "../db.js";
import { toWeatherDto } from "../lib/repos/weather.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });

const DEFAULT_TABLE: WeatherTableEntry[] = [
  { weight: 4, condition: "Clear", temperature: "Mild", description: "Open skies." },
  { weight: 3, condition: "Cloudy", temperature: "Cool", description: "Layered grey overhead." },
  { weight: 2, condition: "Rain", temperature: "Cool", description: "Steady, soaking rain." },
  { weight: 1, condition: "Storm", temperature: "Cold", description: "Wind-driven downpour, distant thunder." },
  { weight: 1, condition: "Fog", temperature: "Chilled", description: "Visibility drops to a stone's throw." },
];

function pickFromTable(table: WeatherTableEntry[]): WeatherTableEntry {
  const total = table.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return table[0]!;
  let r = Math.random() * total;
  for (const e of table) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return table[table.length - 1]!;
}

async function ensureWeather(campaignId: string) {
  return prisma.weather.upsert({
    where: { campaignId },
    create: { campaignId, currentJson: "{}", tableJson: null },
    update: {},
  });
}

export const weatherRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/weather", async (req) => {
    const { id } = cidParams.parse(req.params);
    const row = await ensureWeather(id);
    return toWeatherDto(row);
  });

  app.patch("/:id/weather", async (req) => {
    const { id } = cidParams.parse(req.params);
    const body = setWeatherInput.parse(req.body);
    await ensureWeather(id);
    const updated = await prisma.weather.update({
      where: { campaignId: id },
      data: {
        ...(body.current !== undefined
          ? { currentJson: JSON.stringify(body.current) }
          : {}),
        ...(body.table !== undefined
          ? { tableJson: body.table === null ? null : JSON.stringify(body.table) }
          : {}),
      },
    });
    const dto = toWeatherDto(updated);
    app.bus.emit(id, {
      type: "weather.update",
      campaignId: id,
      broadcastKey: "weather",
      payload: { weather: dto },
    });
    if (body.current !== undefined) {
      await writeLog(
        app,
        id,
        "weather.change",
        `Weather set: ${dto.current.condition}, ${dto.current.temperature}`,
      );
    }
    return dto;
  });

  app.post("/:id/weather/roll", async (req) => {
    const { id } = cidParams.parse(req.params);
    const row = await ensureWeather(id);
    const dto = toWeatherDto(row);
    const table = dto.table && dto.table.length > 0 ? dto.table : DEFAULT_TABLE;
    const pick = pickFromTable(table);
    const updated = await prisma.weather.update({
      where: { campaignId: id },
      data: {
        currentJson: JSON.stringify({
          condition: pick.condition,
          temperature: pick.temperature,
          description: pick.description,
        }),
      },
    });
    const next = toWeatherDto(updated);
    app.bus.emit(id, {
      type: "weather.update",
      campaignId: id,
      broadcastKey: "weather",
      payload: { weather: next },
    });
    await writeLog(
      app,
      id,
      "weather.change",
      `Rolled weather: ${next.current.condition}, ${next.current.temperature}`,
    );
    return next;
  });
};
