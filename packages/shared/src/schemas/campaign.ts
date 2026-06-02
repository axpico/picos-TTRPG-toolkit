import { z } from "zod";
import { role } from "./membership.js";

export const campaign = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  // Only populated for DMs; null for players.
  joinCode: z.string().nullable(),
  // The requesting user's role in this campaign (set by the route).
  myRole: role.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Campaign = z.infer<typeof campaign>;

export const createCampaignInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignInput>;

export const updateCampaignInput = createCampaignInput.partial();
export type UpdateCampaignInput = z.infer<typeof updateCampaignInput>;
