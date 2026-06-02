import { useState } from "react";
import clsx from "clsx";
import { useDiceHistory, useRollDice } from "../modules/dice/api.js";
import { parseBreakdown } from "../modules/dice/format.js";
import { useMe } from "../auth/useAuth.js";

const QUICK = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"] as const;

export function DicePanel({ campaignId }: { campaignId: string }) {
  const [notation, setNotation] = useState("1d20");
  const history = useDiceHistory(campaignId);
  const roll = useRollDice(campaignId);
  const me = useMe();
  const myId = me.data?.user?.id;

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
        <div className="mt-3 flex items-center justify-center gap-3 rounded-lg border border-accent-500/30 bg-accent-500/10 px-3 py-3">
          {/* key re-mounts on each new roll so the pop animation replays */}
          <span key={latest.id} className="animate-[rollPop_0.4s_ease-out] text-4xl font-bold text-accent-500">
            {latest.result}
          </span>
          <div className="text-left">
            <div className="font-mono text-sm text-ink-200">{latest.notation}</div>
            {latest.rollerName && <div className="text-xs text-ink-400">{latest.rollerName}</div>}
          </div>
        </div>
      )}

      <ul className="mt-3 max-h-56 space-y-1 overflow-auto text-sm">
        {history.data?.slice(0, 40).map((r, i) => {
          const mine = Boolean(myId && r.userId === myId);
          return (
            <li
              key={r.id}
              className={clsx(
                "rounded-md border px-2 py-1",
                i === 0 ? "border-accent-500/40 bg-accent-500/5" : "border-ink-800 bg-ink-900",
              )}
            >
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-ink-300">{r.notation}</span>
                <span className="text-ink-500">→</span>
                <span className="font-bold text-ink-100">{r.result}</span>
                <span
                  className={clsx(
                    "ml-auto shrink-0 text-xs",
                    mine ? "font-medium text-accent-400" : "text-ink-500",
                  )}
                >
                  {mine ? "You" : r.rollerName ?? "—"}
                </span>
              </div>
              <div className="font-mono text-xs text-ink-600">{parseBreakdown(r.breakdownJson)}</div>
            </li>
          );
        })}
        {history.data?.length === 0 && (
          <li className="py-2 text-center text-xs text-ink-500">No rolls yet.</li>
        )}
      </ul>
    </section>
  );
}
