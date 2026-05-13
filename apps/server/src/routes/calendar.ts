import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  advanceCalendarInput,
  DEFAULT_CALENDAR_DEFINITION,
  setCalendarInput,
  type CalendarDefinition,
} from "@toolkit/shared";
import { prisma } from "../db.js";
import { toCalendarDto } from "../lib/repos/calendar.js";
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

function clampDay(def: CalendarDefinition, month: number, day: number) {
  const idx = Math.max(1, Math.min(def.monthNames.length, month)) - 1;
  const max = def.daysPerMonth[idx] ?? 30;
  return Math.max(1, Math.min(max, day));
}

function advance(
  def: CalendarDefinition,
  state: { y: number; mo: number; d: number; h: number; mi: number },
  totalMinutes: number,
) {
  let { y, mo, d, h, mi } = state;
  mi += totalMinutes;
  const minutesPerDay = def.hoursPerDay * def.minutesPerHour;
  while (mi >= def.minutesPerHour) {
    mi -= def.minutesPerHour;
    h += 1;
  }
  while (h >= def.hoursPerDay) {
    h -= def.hoursPerDay;
    d += 1;
  }
  // Negative case: not used because totalMinutes always >= 0 here.
  let safety = 10_000;
  while (safety-- > 0) {
    const monthIdx = ((mo - 1) % def.monthNames.length + def.monthNames.length) % def.monthNames.length;
    const dim = def.daysPerMonth[monthIdx] ?? 30;
    if (d <= dim) break;
    d -= dim;
    mo += 1;
    if (mo > def.monthNames.length) {
      mo = 1;
      y += 1;
    }
  }
  void minutesPerDay; // referenced for invariants; calculation uses h/mi rollovers above
  return { y, mo, d, h, mi };
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
    const spr = body.secondsPerRound ?? 6;
    const totalMinutes =
      Math.floor(((body.rounds ?? 0) * spr) / 60) +
      (body.minutes ?? 0) +
      (body.hours ?? 0) * dto.definition.minutesPerHour +
      (body.days ?? 0) * dto.definition.hoursPerDay * dto.definition.minutesPerHour;
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
