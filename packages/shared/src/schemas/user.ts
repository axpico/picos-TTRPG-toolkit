import { z } from "zod";

export const userDto = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
});
export type UserDto = z.infer<typeof userDto>;
