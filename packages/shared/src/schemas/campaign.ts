import { z } from "zod";

export const campaign = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  shareToken: z.string(),
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
