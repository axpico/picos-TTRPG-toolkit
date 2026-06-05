import { useEffect } from "react";
import type { DiceRoll } from "@toolkit/shared";
import { parseBreakdown } from "../../modules/dice/format.js";
import type { RollArgs } from "./useSheetRoll.js";

/**
 * A floating result chip anchored to the bottom of the sheet. Shows the latest
 * roll's total, label, and breakdown, with quick advantage/disadvantage
 * re-rolls of the same notation. Auto-dismisses after a short delay.
 */
export function RollResultPopover({
  roll,
  onClose,
  onReroll,
}: {
  roll: DiceRoll | null;
  onClose: () => void;
  onReroll: (args: RollArgs) => void;
}) {
  useEffect(() => {
    if (!roll) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [roll, onClose]);

  if (!roll) return null;

  const label = roll.label ?? roll.notation;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3">
      <div
        key={roll.id}
        className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-accent-500/40 bg-ink-900/95 px-3 py-2 shadow-xl backdrop-blur"
        style={{ animation: "rollPop 0.28s ease-out" }}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-600/20 text-xl font-bold text-accent-300">
          {roll.result}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-100">{label}</p>
          <p className="truncate text-xs text-ink-400">{parseBreakdown(roll.breakdownJson)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="btn-ghost h-7 px-2 text-xs"
            title="Re-roll with advantage"
            onClick={() => onReroll({ notation: roll.notation, label, advantage: "adv" })}
          >
            ADV
          </button>
          <button
            className="btn-ghost h-7 px-2 text-xs"
            title="Re-roll with disadvantage"
            onClick={() => onReroll({ notation: roll.notation, label, advantage: "dis" })}
          >
            DIS
          </button>
          <button className="btn-ghost h-7 px-2 text-sm" onClick={onClose} title="Dismiss">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
