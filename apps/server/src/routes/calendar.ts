import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  advanceCalendarInput,
  DEFAULT_CALENDAR_DEFINITION,
  setCalendarInput,
} from "@toolkit/shared";
import { prisma } from "../db.js";
import { toCalendarDto } from "../lib/repos/calendar.js";
import { advance, advanceToMinutes, clampDay } from "../lib/calendar.js";
import { writeLog } from "../services/log.js";

const cidParams = z.object({ id: z.string().min(1) });

async function ensureCalendar(campaignId: string) {
  return prisma.calendar.upsert({
    where: { campaignId },
    create: {
      campaignId,
      definitionJson: JSON.stringify(DEFAULT_CALENDAR_DEFINITION),
    },
    update: {},
  });
}

export const calendarRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:id/calendar", async (req) => {
    const { id } = cidParams.parse(req.params);
    const row = await ensureCalendar(id);
    return toCalendarDto(row);
  });

  app.patch("/:id/calendar", async (req) => {
    const { id } = cidParams.parse(req.params);
    const body = setCalendarInput.parse(req.body);
    const existing = await ensureCalendar(id);
    const dto = toCalendarDto(existing);
    const def = body.definition ?? dto.definition;
    const month = body.currentMonth ?? dto.currentMonth;
    const day = clampDay(def, month, body.currentDay ?? dto.currentDay);
    const updated = await prisma.calendar.update({
      where: { campaignId: id },
      data: {
        ...(body.definition !== undefined
          ? { definitionJson: JSON.stringify(body.definition) }
          : {}),
        currentYear: body.currentYear ?? dto.currentYear,
        currentMonth: month,
        currentDay: day,
        currentHour: body.currentHour ?? dto.currentHour,
        currentMinute: body.currentMinute ?? dto.currentMinute,
      },
    });
    const next = toCalendarDto(updated);
    app.bus.emit(id, {
      type: "calendar.update",
      campaignId: id,
      broadcastKey: "calendar",
      payload: { calendar: next },
    });
    return next;
  });

  app.post("/:id/calendar/advance", async (req) => {
    const { id } = cidParams.parse(req.params);
    const body = advanceCalendarInput.parse(req.body ?? {});
    const existing = await ensureCalendar(id);
    const dto = toCalendarDto(existing);
    const totalMinutes = advanceToMinutes(dto.definition, body);
    const next = advance(
      dto.definition,
      { y: dto.currentYear, mo: dto.currentMonth, d: dto.currentDay, h: dto.currentHour, mi: dto.currentMinute },
      Math.max(0, totalMinutes),
    );
    const updated = await prisma.calendar.update({
      where: { campaignId: id },
      data: {
        currentYear: next.y,
        currentMonth: next.mo,
        currentDay: next.d,
        currentHour: next.h,
        currentMinute: next.mi,
      },
    });
    const dtoNext = toCalendarDto(updated);
    app.bus.emit(id, {
      type: "calendar.update",
      campaignId: id,
      broadcastKey: "calendar",
      payload: { calendar: dtoNext },
    });
    await writeLog(
      app,
      id,
      "calendar.advance",
      `Advanced time by ${totalMinutes} minute(s).`,
    );
    return dtoNext;
  });
};
