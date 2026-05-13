import { z } from "zod";

export const loginInput = z.object({
  password: z.string().min(1).max(512),
});
export type LoginInput = z.infer<typeof loginInput>;

export const authMe = z.object({
  authenticated: z.boolean(),
});
export type AuthMe = z.infer<typeof authMe>;
