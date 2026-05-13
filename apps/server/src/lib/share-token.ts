import { randomBytes } from "node:crypto";

/** URL-safe 24-byte share token (32 chars). Used for player view gating. */
export function generateShareToken(): string {
  return randomBytes(24)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
