import { useState } from "react";
import clsx from "clsx";
import { useDiceHistory, useRollDice } from "../modules/dice/api.js";
import { parseBreakdown } from "../modules/dice/format.js";

const QUICK = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"] as const;

export function DicePanel({ campaignId }: { campaignId: string }) {
  const [notation, setNotation] = useState("1d20");
  const history = useDiceHistory(campaignId);
  const roll = useRollDice(campaignId);

  const doRoll = () => {
    if (!notation.trim()) return;
    roll.mutate({ notation: notation.trim() });
  };

  const latest = history.data?.[0];

  return (
    <section className="card flex flex-col p-4">
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-300">Dice</h2>
      <div className="mb-2 flex flex-wrap gap-1">
        {QUICK.map((d) => (
          <button
            key={d}
            className="btn-ghost h-7 px-2 font-mono text-xs"
            onClick={() => setNotation((p) => (p.trim() && p !== "1d20" ? `${p}+1${d}` : `1${d}`))}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          className="input font-mono"
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doRoll()}
          placeholder="e.g. 2d6+3"
          spellCheck={false}
        />
        <button className="btn-primary px-4 font-semibold" onClick={doRoll} disabled={roll.isPending || !notation.trim()}>
          Roll
        </button>
      </div>

      {latest && (
        <div className="mt-2 flex items-baseline gap-2 rounded-md bg-accent-500/10 px-3 py-2">
          <span className="font-mono text-xs text-ink-400">{latest.notation}</span>
          <span className="text-ink-400">→</span>
          <span className="text-2xl font-bold text-accent-500">{latest.result}</span>
        </div>
      )}

      <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-sm">
        {history.data?.slice(0, 30).map((r, i) => (
          <li
            key={r.id}
            className={clsx(
              "rounded-md border px-2 py-1",
              i === 0 ? "border-accent-500/40 bg-accent-500/5" : "border-ink-800 bg-ink-900",
            )}
          >
            <span className="font-mono text-ink-300">{r.notation}</span>
            <span className="mx-1 text-ink-500">→</span>
            <span className="font-bold text-ink-100">{r.result}</span>
            <span className="ml-2 font-mono text-xs text-ink-500">{parseBreakdown(r.breakdownJson)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
