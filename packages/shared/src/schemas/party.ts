import { z } from "zod";
import { statBlock } from "./statblock.js";

export const partyMemberStatus = z.enum(["active", "down", "stable", "dead"]);
export type PartyMemberStatus = z.infer<typeof partyMemberStatus>;

export const partyMember = z.object({
  id: z.string(),
  campaignId: z.string(),
  // The player account that owns this character, if assigned by the DM.
  userId: z.string().nullable(),
  name: z.string(),
  playerName: z.string().nullable(),
  hp: z.number().int(),
  hpMax: z.number().int(),
  status: partyMemberStatus,
  conditions: z.array(z.string()),
  notes: z.string().nullable(),
  portraitAssetId: z.string().nullable(),
  stats: statBlock,
  order: z.number().int(),
});
export type PartyMember = z.infer<typeof partyMember>;

export const createPartyMemberInput = z.object({
  name: z.string().min(1).max(120),
  playerName: z.string().max(120).optional(),
  hp: z.number().int().optional(),
  hpMax: z.number().int().optional(),
  status: partyMemberStatus.optional(),
  conditions: z.array(z.string().min(1).max(60)).max(40).optional(),
  notes: z.string().max(4000).optional(),
  stats: statBlock.optional(),
});
export type CreatePartyMemberInput = z.infer<typeof createPartyMemberInput>;

export const updatePartyMemberInput = createPartyMemberInput.partial().extend({
  order: z.number().int().optional(),
  // DM assigns/clears the owning player account (null clears).
  userId: z.string().nullable().optional(),
});
export type UpdatePartyMemberInput = z.infer<typeof updatePartyMemberInput>;

/** What a player may change on their own character (self-service, restricted). */
export const updateMyCharacterInput = z.object({
  hp: z.number().int().optional(),
  status: partyMemberStatus.optional(),
  conditions: z.array(z.string().min(1).max(60)).max(40).optional(),
  notes: z.string().max(4000).optional(),
});
export type UpdateMyCharacterInput = z.infer<typeof updateMyCharacterInput>;
