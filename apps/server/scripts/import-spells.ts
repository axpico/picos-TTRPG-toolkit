import { getImportState, runImport } from "../src/lib/spell-import/importer.js";

/**
 * Headless spell import: `npm run import:spells -w apps/server`.
 * Same code path as POST /api/spells/import, with progress on stdout.
 */

const includeUnofficial = process.argv.includes("--include-unofficial");

const log = {
  info: (obj: unknown, msg?: string) => console.log(msg ?? "", obj),
  warn: (obj: unknown, msg?: string) => console.warn(msg ?? "", obj),
  error: (obj: unknown, msg?: string) => console.error(msg ?? "", obj),
};

const progress = setInterval(() => {
  const s = getImportState();
  if (s.status === "running" && s.total > 0) {
    console.log(`progress: ${s.done}/${s.total} (${s.failed.length} failed)`);
  }
}, 5_000);

const result = await runImport({ log, includeUnofficial });
clearInterval(progress);

console.log(
  `import ${result.status}: ${result.done}/${result.total} processed, ${result.failed.length} failed`,
);
if (result.failed.length > 0) console.log("failed slugs:", result.failed.join(", "));
if (result.status === "error") {
  console.error(result.error);
  process.exit(1);
}
