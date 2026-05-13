/** Simple dice notation parser and roller.
 * Supports expressions like: 2d6+1d4-2+3
 * Returns breakdown as array of terms with individual rolls.
 */

export type DiceTerm = { kind: "roll"; count: number; sides: number; rolls: number[] } | { kind: "const"; value: number };

function randInt(rng: () => number, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function rollNotation(notation: string, seed?: string) {
  const rng = Math.random;
  const cleaned = notation.replace(/\s+/g, "");
  // Tokenize: match NdM or integer with optional leading +/-. We'll scan left to right.
  const re = /([+-]?)(\d*)d(\d+)|([+-]?\d+)/g;
  let m: RegExpExecArray | null;
  const terms: DiceTerm[] = [];
  while ((m = re.exec(cleaned))) {
    if (m[4]) {
      // constant
      const v = Number(m[4]);
      terms.push({ kind: "const", value: v });
    } else {
      const sign = m[1] === "-" ? -1 : 1;
      const count = m[2] ? Number(m[2]) : 1;
      const sides = Number(m[3]);
      const rolls: number[] = [];
      for (let i = 0; i < count; i++) {
        rolls.push(sign * randInt(rng, 1, sides));
      }
      terms.push({ kind: "roll", count, sides, rolls });
    }
  }

  let total = 0;
  for (const t of terms) {
    if (t.kind === "const") total += t.value;
    else total += t.rolls.reduce((s, v) => s + v, 0);
  }

  return { notation, total, terms, breakdownJson: JSON.stringify(terms) };
}
