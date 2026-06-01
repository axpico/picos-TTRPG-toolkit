export type BreakdownTerm =
  | { kind: "roll"; count: number; sides: number; rolls: number[] }
  | { kind: "const"; value: number };

/** Render a stored dice breakdown (JSON array of terms) as a human string. */
export function parseBreakdown(json: string): string {
  try {
    const terms = JSON.parse(json) as BreakdownTerm[];
    const parts: string[] = [];
    for (const t of terms) {
      if (t.kind === "roll") {
        const rollStr = t.rolls.join("+");
        const sum = t.rolls.reduce((a, b) => a + b, 0);
        parts.push(`${t.count}d${t.sides} [${rollStr}=${sum}]`);
      } else if (t.kind === "const") {
        parts.push(t.value >= 0 ? `+${t.value}` : `${t.value}`);
      }
    }
    return parts.join(" ").replace(/^\+/, "");
  } catch {
    return json;
  }
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
