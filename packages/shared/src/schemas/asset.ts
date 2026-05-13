import { z } from "zod";

export const asset = z.object({
  id: z.string(),
  filename: z.string(),
  mime: z.string(),
  size: z.number().int(),
  url: z.string(), // server-relative URL for retrieval
  createdAt: z.string(),
});
export type Asset = z.infer<typeof asset>;

export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
