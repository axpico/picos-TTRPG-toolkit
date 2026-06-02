import { z } from "zod";
import { userDto } from "./user.js";

export const role = z.enum(["dm", "player"]);
export type Role = z.infer<typeof role>;

export const membership = z.object({
  campaignId: z.string(),
  role,
});
export type Membership = z.infer<typeof membership>;

/** A member of a campaign, with their user info (for the DM's member list). */
export const campaignMember = z.object({
  userId: z.string(),
  role,
  user: userDto,
});
export type CampaignMember = z.infer<typeof campaignMember>;

export const joinCampaignInput = z.object({
  joinCode: z.string().min(1).max(120),
});
export type JoinCampaignInput = z.infer<typeof joinCampaignInput>;

export const setMemberRoleInput = z.object({
  role,
});
export type SetMemberRoleInput = z.infer<typeof setMemberRoleInput>;
