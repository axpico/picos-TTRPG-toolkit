import { useCallback, useState } from "react";
import type { DiceRoll } from "@toolkit/shared";
import { useRollDice } from "../../modules/dice/api.js";

export type RollArgs = {
  /** Dice notation, e.g. "1d20+5" or "2d6+3". */
  notation: string;
  /** Human label shown in the popover and the shared dice log. */
  label: string;
  /** Roll the leading d20 with advantage/disadvantage. */
  advantage?: "adv" | "dis";
};

/**
 * Bridges sheet UI to the existing dice endpoint. `trigger` posts a roll via
 * {@link useRollDice} — which persists it to the campaign's shared history and
 * broadcasts it to players — and stashes the returned roll as `last` so the
 * sheet can show an inline result popover ("Both" behavior). Labels are built by
 * the caller (they already include the creature's name). A no-op when there is
 * no campaign (e.g. a library NPC opened outside a campaign).
 */
export function useSheetRoll(campaignId: string | undefined) {
  const roll = useRollDice(campaignId ?? "");
  const [last, setLast] = useState<DiceRoll | null>(null);

  const trigger = useCallback(
    (args: RollArgs) => {
      if (!campaignId) return;
      roll.mutate(
        { notation: args.notation, label: args.label, advantage: args.advantage },
        { onSuccess: (dto) => setLast(dto) },
      );
    },
    [campaignId, roll],
  );

  const clear = useCallback(() => setLast(null), []);

  return { trigger, last, clear, pending: roll.isPending, enabled: Boolean(campaignId) };
}
