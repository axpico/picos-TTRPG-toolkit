/** Import/export helpers for random tables.
 *
 * The on-disk / clipboard format is a small versioned envelope so future
 * changes stay backwards-compatible. Only the user-authored fields are kept —
 * server-assigned ids, ordering and timestamps are intentionally dropped so an
 * export can be re-imported into any campaign.
 */
import { z } from "zod";
import {
  createRollTableInput,
  type CreateRollTableInput,
  type RollTable,
} from "@toolkit/shared";

export const EXPORT_VERSION = 1;

/** Lenient entry shape for parsing: blank text is tolerated here and filtered
 * out later, and weight may be omitted (defaults to 1). */
const importedEntry = z.object({
  weight: z.number().optional(),
  text: z.string(),
});

/** A single imported table. Validation against the stricter create schema
 * happens after entries are cleaned in `parseTablesImport`. */
const exportedTable = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  entries: z.array(importedEntry).default([]),
});

const envelope = z.object({
  version: z.number().int().optional(),
  tables: z.array(exportedTable),
});

/** Serialize tables to a pretty JSON string for download / clipboard. */
export function serializeTables(tables: RollTable[]): string {
  const payload = {
    version: EXPORT_VERSION,
    tables: tables.map((t) => ({
      name: t.name,
      ...(t.description ? { description: t.description } : {}),
      entries: t.entries.map((e) => ({ weight: e.weight, text: e.text })),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parse a pasted/uploaded JSON string into create-ready table inputs.
 *
 * Accepts either the `{ version, tables: [...] }` envelope or a bare array of
 * tables. Entries with blank text are dropped, missing weights default to 1,
 * and each result is validated against the shared `createRollTableInput`
 * schema. Throws an `Error` with a readable message on malformed input.
 */
export function parseTablesImport(text: string): CreateRollTableInput[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Not valid JSON.");
  }

  const candidate = Array.isArray(raw) ? { tables: raw } : raw;
  const parsed = envelope.safeParse(candidate);
  if (!parsed.success) {
    throw new Error("Unrecognized format — expected a list of tables.");
  }
  if (parsed.data.tables.length === 0) {
    throw new Error("No tables found to import.");
  }

  return parsed.data.tables.map((t, i) => {
    const entries = (t.entries ?? [])
      .filter((e) => e.text.trim())
      .map((e) => ({
        weight: Math.min(1000, Math.max(1, Math.floor(e.weight ?? 1))),
        text: e.text.trim(),
      }));
    const result = createRollTableInput.safeParse({
      name: t.name,
      ...(t.description != null ? { description: t.description } : {}),
      entries,
    });
    if (!result.success) {
      throw new Error(`Table ${i + 1} ("${t.name}") is invalid.`);
    }
    return result.data;
  });
}

/** Trigger a browser download of a JSON string as a file. */
export function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
