/** Weighted random selection over roll-table entries.
 * Pure and rng-injectable so it can be unit-tested deterministically.
 */

export interface WeightedEntry {
  weight: number;
  text: string;
}

export interface WeightedPick<T> {
  index: number;
  entry: T;
}

/**
 * Pick one entry with probability proportional to its `weight`. Weights below 1
 * are clamped to 1 so a malformed entry can still be selected. Throws on an
 * empty list — callers must guard against rolling an entry-less table.
 */
export function pickWeighted<T extends WeightedEntry>(
  entries: T[],
  rng: () => number = Math.random,
): WeightedPick<T> {
  const last = entries.length - 1;
  if (last < 0) {
    throw new Error("pickWeighted: cannot pick from an empty table");
  }
  const weight = (e: T) => Math.max(1, Math.floor(e.weight));
  const total = entries.reduce((sum, e) => sum + weight(e), 0);
  let roll = Math.floor(rng() * total);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    roll -= weight(entry);
    if (roll < 0) return { index: i, entry };
  }
  // Floating-point edge (rng() === ~1): fall back to the last entry.
  return { index: last, entry: entries[last]! };
}
