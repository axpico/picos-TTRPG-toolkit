import { useRef, useState } from "react";
import clsx from "clsx";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useDiceHistory, useRollDice } from "./api.js";
import { fmtTime, parseBreakdown } from "./format.js";

const QUICK_DICE = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"] as const;

function DiceWidget({ campaignId }: WidgetContext) {
  const [notation, setNotation] = useState("1d20");
  const [label, setLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const history = useDiceHistory(campaignId);
  const roll = useRollDice(campaignId);

  const doRoll = () => {
    if (!notation.trim()) return;
    roll.mutate({ notation: notation.trim(), label: label.trim() || undefined });
  };

  const appendNotation = (die: string) => {
    setNotation((prev) => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed === "1d20") return `1${die}`;
      return `${trimmed}+1${die}`;
    });
    inputRef.current?.focus();
  };

  const latest = history.data?.[0];

  return (
    <div className="flex h-full flex-col">
      {/* Quick dice buttons */}
      <div className="flex flex-wrap gap-1 border-b border-ink-700 px-2 py-1.5">
        {QUICK_DICE.map((d) => (
          <button
            key={d}
            className="btn-ghost h-7 px-2 text-xs font-mono"
            onClick={() => appendNotation(d)}
            title={`Add ${d}`}
          >
            {d}
          </button>
        ))}
        <button
          className="btn-ghost ml-auto h-7 px-2 text-xs text-ink-500"
          onClick={() => setNotation("")}
          title="Clear notation"
        >
          Clear
        </button>
      </div>

      {/* Roll controls */}
      <div className="flex items-center gap-1 border-b border-ink-700 px-2 py-1.5">
        <input
          ref={inputRef}
          className="input w-36 font-mono text-sm"
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doRoll()}
          placeholder="e.g. 2d6+5"
          spellCheck={false}
        />
        <input
          className="input flex-1"
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doRoll()}
        />
        <button
          className="btn-primary px-3 font-semibold"
          onClick={doRoll}
          disabled={roll.isPending || !notation.trim()}
        >
          Roll
        </button>
      </div>

      {/* Latest result banner */}
      {latest && (
        <div className="flex items-baseline gap-2 border-b border-ink-700 bg-accent-500/10 px-3 py-2">
          <span className="font-mono text-xs text-ink-400">{latest.notation}</span>
          <span className="text-ink-400">→</span>
          <span className="text-2xl font-bold text-accent-500">{latest.result}</span>
          {latest.label && (
            <span className="ml-auto text-xs text-ink-400 italic">{latest.label}</span>
          )}
        </div>
      )}

      {/* History list */}
      <div className="flex-1 overflow-auto px-2 py-2">
        {history.data && history.data.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {history.data.map((r, idx) => (
              <li
                key={r.id}
                className={clsx(
                  "rounded-md border px-2 py-1.5",
                  idx === 0
                    ? "border-accent-500/40 bg-accent-500/5"
                    : "border-ink-800 bg-ink-900",
                )}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-ink-300">{r.notation}</span>
                  <span className="text-ink-500">→</span>
                  <span
                    className={clsx(
                      "font-bold",
                      idx === 0 ? "text-accent-500 text-base" : "text-ink-100",
                    )}
                  >
                    {r.result}
                  </span>
                  {r.label && (
                    <span className="text-xs text-ink-500 italic">{r.label}</span>
                  )}
                  <span className="ml-auto shrink-0 font-mono text-xs text-ink-600">
                    {fmtTime(r.createdAt)}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-xs text-ink-500">
                  {parseBreakdown(r.breakdownJson)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">
            No rolls yet — pick a die or type a notation.
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: "dice",
  title: "Dice Roller",
  defaultSize: { w: 360, h: 400 },
  Component: DiceWidget,
});

export {};
