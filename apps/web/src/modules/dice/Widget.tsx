import { useRef, useState } from "react";
import clsx from "clsx";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useMe, roleIn } from "../../auth/useAuth.js";
import { Skeleton } from "../../components/Skeleton.js";
import { EmptyState } from "../../components/EmptyState.js";
import { PendingButton } from "../shared.js";
import { useDiceHistory, useRollDice } from "./api.js";
import { fmtTime, parseBreakdown } from "./format.js";

const QUICK_DICE = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"] as const;

function DiceWidget({ campaignId }: WidgetContext) {
  const [notation, setNotation] = useState("1d20");
  const [label, setLabel] = useState("");
  const [hidden, setHidden] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const history = useDiceHistory(campaignId);
  const roll = useRollDice(campaignId);
  const me = useMe();
  const isDM = roleIn(me.data?.memberships, campaignId) === "dm";

  const doRoll = (advantage?: "adv" | "dis") => {
    if (!notation.trim()) return;
    roll.mutate({
      notation: notation.trim(),
      label: label.trim() || undefined,
      hidden: isDM && hidden ? true : undefined,
      advantage,
    });
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
      <div className="flex flex-wrap items-center gap-1 border-b border-ink-700 px-2 py-1.5">
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
          className="btn-ghost ml-auto h-7 px-2 text-xs text-ink-400"
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
          className="input w-32 font-mono text-sm"
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
          className="btn-ghost h-7 px-1.5 text-xs"
          onClick={() => doRoll("adv")}
          disabled={roll.isPending || !notation.trim()}
          title="Roll twice, keep the higher total (advantage)"
        >
          Adv
        </button>
        <button
          className="btn-ghost h-7 px-1.5 text-xs"
          onClick={() => doRoll("dis")}
          disabled={roll.isPending || !notation.trim()}
          title="Roll twice, keep the lower total (disadvantage)"
        >
          Dis
        </button>
        <PendingButton
          className="btn-primary px-3 font-semibold"
          onClick={() => doRoll()}
          pending={roll.isPending}
          disabled={!notation.trim()}
        >
          Roll
        </PendingButton>
      </div>

      {/* DM-only hidden toggle */}
      {isDM && (
        <label
          className={clsx(
            "flex cursor-pointer select-none items-center gap-1.5 border-b border-ink-700 px-2 py-1 text-xs",
            hidden ? "bg-amber-500/10 text-amber-300" : "text-ink-400",
          )}
          title="Hidden rolls stay GM-only — they never appear in the player feed"
        >
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          🔒 Hidden roll (GM only)
        </label>
      )}

      {/* Latest result banner */}
      {latest && (
        <div className="flex items-baseline gap-2 border-b border-ink-700 bg-accent-500/10 px-3 py-2">
          {latest.hidden && <span title="Hidden roll">🔒</span>}
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
        {history.isLoading ? (
          <div className="space-y-2" aria-hidden="true">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : history.data && history.data.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {history.data.map((r, idx) => (
              <li
                key={r.id}
                className={clsx(
                  "rounded-md border px-2 py-1.5",
                  r.hidden
                    ? "border-amber-500/30 bg-amber-500/5"
                    : idx === 0
                      ? "border-accent-500/40 bg-accent-500/5"
                      : "border-ink-800 bg-ink-900",
                )}
              >
                <div className="flex items-baseline gap-2">
                  {r.hidden && <span title="Hidden — GM only">🔒</span>}
                  <span className="font-mono text-ink-300">{r.notation}</span>
                  <span className="text-ink-400">→</span>
                  <span
                    className={clsx(
                      "font-bold",
                      idx === 0 ? "text-accent-500 text-base" : "text-ink-100",
                    )}
                  >
                    {r.result}
                  </span>
                  {r.label && (
                    <span className="text-xs text-ink-400 italic">{r.label}</span>
                  )}
                  {r.rollerName && (
                    <span className="text-xs text-ink-500">· {r.rollerName}</span>
                  )}
                  <span className="ml-auto shrink-0 font-mono text-xs text-ink-500">
                    {fmtTime(r.createdAt)}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-xs text-ink-400">
                  {parseBreakdown(r.breakdownJson)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon="🎲"
            title="No rolls yet"
            description="Pick a die or type a notation to get rolling."
          />
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: "dice",
  title: "Dice Roller",
  defaultSize: { w: 380, h: 420 },
  broadcastKey: "dice",
  Component: DiceWidget,
});

export {};
