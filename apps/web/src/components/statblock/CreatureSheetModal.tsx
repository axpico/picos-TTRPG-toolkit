import { useState, type ReactNode } from "react";
import clsx from "clsx";
import type { SheetKind, StatBlock } from "@toolkit/shared";
import { Modal } from "../Modal.js";
import { RollableStatBlockView } from "./RollableStatBlockView.js";
import { StatBlockEditor } from "./StatBlockEditor.js";
import { StatBlockGenerator } from "./StatBlockGenerator.js";
import { RollResultPopover } from "./RollResultPopover.js";
import { useSheetRoll } from "./useSheetRoll.js";

/**
 * A roomy modal "character sheet": a title/portrait header, a View/Edit toggle,
 * an optional `flavor` slot for entity-specific fields (type, role, notes…), and
 * the shared stat-block view/editor. Reused by Bestiary, NPC, Party, and tokens.
 *
 * When `campaignId` is provided, the view becomes interactive: abilities, saves,
 * skills, attacks, initiative, and HP are clickable to roll dice — logged to the
 * shared dice history, broadcast to players, and echoed in an inline popover.
 */
export function CreatureSheetModal({
  open,
  onClose,
  title,
  subtitle,
  portraitUrl,
  cr,
  stats,
  onChange,
  hideHp = false,
  readOnly = false,
  flavor,
  campaignId,
  rollerName,
  kind = "npc",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  portraitUrl?: string | null;
  cr?: string | null;
  stats: StatBlock;
  onChange?: (next: StatBlock) => void;
  hideHp?: boolean;
  readOnly?: boolean;
  flavor?: ReactNode;
  /** Enables rolling against the campaign's shared dice log. */
  campaignId?: string;
  /** Prefix shown on rolls made from this sheet (the creature's name). */
  rollerName?: string;
  /** Tunes the quick-generate power scale (level vs challenge rating). */
  kind?: SheetKind;
}) {
  const [mode, setMode] = useState<"view" | "edit">(readOnly ? "view" : "edit");
  const editing = mode === "edit" && !readOnly && Boolean(onChange);
  const roll = useSheetRoll(campaignId);
  const who = rollerName ?? title;

  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl">
      <div className="relative flex max-h-[85vh] flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-ink-700 bg-ink-900/60 px-4 py-3">
          {portraitUrl && <img src={portraitUrl} alt="" className="h-10 w-10 rounded-md object-cover" />}
          <div className="min-w-0 flex-1">
            <h2 className="display truncate text-lg font-semibold text-ink-50">{title || "Untitled"}</h2>
            {subtitle && <p className="truncate text-xs italic text-ink-400">{subtitle}</p>}
          </div>
          {!readOnly && onChange && (
            <div className="flex shrink-0 items-center rounded-lg border border-ink-700 bg-ink-900/60 p-0.5">
              {(["edit", "view"] as const).map((m) => (
                <button
                  key={m}
                  className={clsx(
                    "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                    mode === m ? "bg-accent-600 text-white" : "text-ink-300 hover:bg-ink-800",
                  )}
                  onClick={() => setMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          <button className="btn-ghost shrink-0 px-2 py-1" onClick={onClose} title="Close">
            ×
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {flavor && <div className="mb-4">{flavor}</div>}
          {editing && onChange ? (
            <div className="space-y-4">
              <StatBlockGenerator kind={kind} onGenerate={onChange} />
              <StatBlockEditor value={stats} onChange={onChange} hideHp={hideHp} />
            </div>
          ) : (
            <RollableStatBlockView
              stats={stats}
              who={who}
              cr={cr}
              meta={subtitle}
              portraitUrl={portraitUrl}
              onRoll={roll.enabled ? roll.trigger : undefined}
            />
          )}
        </div>

        {/* Inline roll result */}
        <RollResultPopover roll={roll.last} onClose={roll.clear} onReroll={roll.trigger} />
      </div>
    </Modal>
  );
}
