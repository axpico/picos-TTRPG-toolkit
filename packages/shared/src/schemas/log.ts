import { z } from "zod";

export const logEntryKind = z.enum([
  "campaign.update",
  "party.create",
  "party.update",
  "party.delete",
  "session.create",
  "session.update",
  "session.delete",
  "combat.start",
  "combat.end",
  "combat.turn",
  "combat.round",
  "combat.create",
  "combat.update",
  "combat.delete",
  "combat.combatant.add",
  "combat.combatant.update",
  "combat.combatant.remove",
  "npc.create",
  "npc.update",
  "npc.delete",
  "monster.create",
  "monster.update",
  "monster.delete",
  "shop.create",
  "shop.update",
  "shop.delete",
  "shop.generate",
  "weather.change",
  "calendar.advance",
  "dice.roll",
  "note",
  "broadcast.change",
  "other",
]);
export type LogEntryKind = z.infer<typeof logEntryKind>;

export const logEntry = z.object({
  id: z.string(),
  campaignId: z.string(),
  kind: logEntryKind,
  message: z.string(),
  data: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});
export type LogEntry = z.infer<typeof logEntry>;

export const createLogEntryInput = z.object({
  kind: logEntryKind,
  message: z.string().min(1).max(2000),
  data: z.record(z.unknown()).optional(),
});
export type CreateLogEntryInput = z.infer<typeof createLogEntryInput>;
