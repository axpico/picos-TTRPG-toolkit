import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  UPLOAD_DIR: z.string().min(1).default("./data/uploads"),
  SESSION_KEY: z
    .string()
    .min(1, "SESSION_KEY missing. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""),
  GM_PASSWORD: z.string().min(1).optional(),
  GM_USERNAME: z.string().min(1).default("gm"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("[env] invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
