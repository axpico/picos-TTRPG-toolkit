/**
 * Pure spell-name matching against a speech transcript. Kept free of React and
 * the Web Speech API so it can be unit-tested directly.
 */

/** How many trailing transcript tokens count as "recent speech". */
const RECENT_TOKEN_WINDOW = 12;
/** Minimum mean per-token similarity for a fuzzy hit. */
export const DEFAULT_MATCH_THRESHOLD = 0.78;
/** Score margin within which the longer spell name wins. */
const TIE_MARGIN = 0.02;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const sub = prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      cur.push(Math.min(prev[j]! + 1, cur[j - 1]! + 1, sub));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

export interface SpellNameIndex {
  id: string;
  name: string;
  norm: string;
  tokens: string[];
}

export function buildIndex(spells: { id: string; name: string }[]): SpellNameIndex[] {
  return spells
    .map((s) => {
      const norm = normalize(s.name);
      return { id: s.id, name: s.name, norm, tokens: norm.split(" ").filter(Boolean) };
    })
    .filter((s) => s.tokens.length > 0);
}

export interface SpellMatch {
  id: string;
  name: string;
  score: number;
}

function tokenSimilarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/**
 * Find the spell most plausibly named in recent speech. Exact token-aligned
 * occurrences win outright (longest name first, so "mass cure wounds" beats
 * "cure wounds"); otherwise a sliding fuzzy window absorbs the speech engine's
 * misspellings. Returns null when nothing clears the threshold.
 */
export function matchSpellInTranscript(
  transcript: string,
  index: SpellNameIndex[],
  threshold: number = DEFAULT_MATCH_THRESHOLD,
): SpellMatch | null {
  const tokens = normalize(transcript).split(" ").filter(Boolean).slice(-RECENT_TOKEN_WINDOW);
  if (tokens.length === 0 || index.length === 0) return null;
  const windowText = tokens.join(" ");

  let exact: { entry: SpellNameIndex; position: number } | null = null;
  for (const entry of index) {
    const position = windowText.lastIndexOf(entry.norm);
    if (position < 0) continue;
    // Token-aligned only: must not cut a word in half on either side.
    const before = position === 0 ? " " : windowText[position - 1];
    const afterIdx = position + entry.norm.length;
    const after = afterIdx >= windowText.length ? " " : windowText[afterIdx];
    if (before !== " " || after !== " ") continue;
    if (
      !exact ||
      entry.norm.length > exact.entry.norm.length ||
      (entry.norm.length === exact.entry.norm.length && position > exact.position)
    ) {
      exact = { entry, position };
    }
  }
  if (exact) return { id: exact.entry.id, name: exact.entry.name, score: 1 };

  let best: { entry: SpellNameIndex; score: number } | null = null;
  for (const entry of index) {
    const n = entry.tokens.length;
    if (n > tokens.length) continue;
    for (let start = 0; start + n <= tokens.length; start += 1) {
      let sum = 0;
      for (let k = 0; k < n; k += 1) sum += tokenSimilarity(tokens[start + k]!, entry.tokens[k]!);
      const score = sum / n;
      if (score < threshold) continue;
      if (
        !best ||
        score > best.score + TIE_MARGIN ||
        (Math.abs(score - best.score) <= TIE_MARGIN && n > best.entry.tokens.length)
      ) {
        best = { entry, score };
      }
    }
  }
  return best ? { id: best.entry.id, name: best.entry.name, score: best.score } : null;
}
