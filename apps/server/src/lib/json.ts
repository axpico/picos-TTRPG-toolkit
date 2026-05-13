import { z } from "zod";

export function parseJsonField<T>(raw: string | null | undefined, schema: z.ZodType<T>, fallback: T): T {
  if (!raw) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  const result = schema.safeParse(parsed);
  return result.success ? result.data : fallback;
}

export function stringifyJsonField<T>(value: T, schema: z.ZodType<T>): string {
  return JSON.stringify(schema.parse(value));
}
