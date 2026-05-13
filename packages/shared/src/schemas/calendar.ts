import { z } from "zod";

export const calendarDefinition = z.object({
  monthNames: z.array(z.string().min(1).max(60)).min(1).max(60),
  // Days per month, parallel to monthNames.
  daysPerMonth: z.array(z.number().int().min(1).max(400)).min(1).max(60),
  weekdayNames: z.array(z.string().min(1).max(60)).min(1).max(30),
  hoursPerDay: z.number().int().min(1).max(48),
  minutesPerHour: z.number().int().min(1).max(120),
});
export type CalendarDefinition = z.infer<typeof calendarDefinition>;

export const calendar = z.object({
  id: z.string(),
  campaignId: z.string(),
  definition: calendarDefinition,
  currentYear: z.number().int(),
  currentMonth: z.number().int(),
  currentDay: z.number().int(),
  currentHour: z.number().int(),
  currentMinute: z.number().int(),
});
export type Calendar = z.infer<typeof calendar>;

export const setCalendarInput = z.object({
  definition: calendarDefinition.optional(),
  currentYear: z.number().int().optional(),
  currentMonth: z.number().int().min(1).optional(),
  currentDay: z.number().int().min(1).optional(),
  currentHour: z.number().int().min(0).optional(),
  currentMinute: z.number().int().min(0).optional(),
});
export type SetCalendarInput = z.infer<typeof setCalendarInput>;

export const advanceCalendarInput = z.object({
  rounds: z.number().int().optional(),
  minutes: z.number().int().optional(),
  hours: z.number().int().optional(),
  days: z.number().int().optional(),
  // 6-second rounds by default.
  secondsPerRound: z.number().int().min(1).max(600).optional(),
});
export type AdvanceCalendarInput = z.infer<typeof advanceCalendarInput>;

export const DEFAULT_CALENDAR_DEFINITION: CalendarDefinition = {
  monthNames: [
    "Firstmoon", "Wintershade", "Stormtide", "Bloomfall", "Greenrise", "Hightide",
    "Sunsteep", "Goldfall", "Reaping", "Emberwake", "Frostturn", "Yearend",
  ],
  daysPerMonth: [30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  weekdayNames: ["Onesday", "Twoday", "Treyday", "Fourday", "Fiveday", "Restday", "Holyday"],
  hoursPerDay: 24,
  minutesPerHour: 60,
};
