import { z } from "zod";

export const externalLink = z.object({
  label: z.string().min(1).max(120),
  // Free-form URI/URL. Stored as a string so we can accept obsidian://, onenote:, etc.
  href: z.string().min(1).max(2000),
});
export type ExternalLink = z.infer<typeof externalLink>;

export const sessionEntry = z.object({
  id: z.string(),
  campaignId: z.string(),
  title: z.string(),
  date: z.string().nullable(),
  summary: z.string().nullable(),
  notes: z.string().nullable(),
  externalLinks: z.array(externalLink),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SessionEntry = z.infer<typeof sessionEntry>;

export const createSessionInput = z.object({
  title: z.string().min(1).max(200),
  date: z.string().datetime().optional(),
  summary: z.string().max(2000).optional(),
  notes: z.string().max(100_000).optional(),
  externalLinks: z.array(externalLink).max(40).optional(),
});
export type CreateSessionInput = z.infer<typeof createSessionInput>;

export const updateSessionInput = createSessionInput.partial();
export type UpdateSessionInput = z.infer<typeof updateSessionInput>;
