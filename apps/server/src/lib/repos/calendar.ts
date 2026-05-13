import {
  calendarDefinition,
  DEFAULT_CALENDAR_DEFINITION,
  type Calendar as CalendarDto,
} from "@toolkit/shared";
import type { Calendar as DbCalendar } from "@prisma/client";
import { parseJsonField } from "../json.js";

export function toCalendarDto(row: DbCalendar): CalendarDto {
  const def = parseJsonField(
    row.definitionJson,
    calendarDefinition,
    DEFAULT_CALENDAR_DEFINITION,
  );
  return {
    id: row.id,
    campaignId: row.campaignId,
    definition: def,
    currentYear: row.currentYear,
    currentMonth: row.currentMonth,
    currentDay: row.currentDay,
    currentHour: row.currentHour,
    currentMinute: row.currentMinute,
  };
}
