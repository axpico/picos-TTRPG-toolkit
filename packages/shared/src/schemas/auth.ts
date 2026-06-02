import { z } from "zod";
import { userDto } from "./user.js";
import { membership } from "./membership.js";

export const registerInput = z.object({
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, _ . - only"),
  password: z.string().min(6).max(512),
  displayName: z.string().min(1).max(80).optional(),
});
export type RegisterInput = z.infer<typeof registerInput>;

export const loginInput = z.object({
  username: z.string().min(1).max(40),
  password: z.string().min(1).max(512),
});
export type LoginInput = z.infer<typeof loginInput>;

export const authMe = z.object({
  authenticated: z.boolean(),
  user: userDto.optional(),
  memberships: z.array(membership).optional(),
});
export type AuthMe = z.infer<typeof authMe>;
