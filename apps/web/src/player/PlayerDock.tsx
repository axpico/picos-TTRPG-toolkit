import { useState } from "react";
import { Modal } from "../components/Modal.js";
import { MyCharacterPanel } from "./MyCharacterPanel.js";
import { DicePanel } from "./DicePanel.js";

/**
 * The player's personal tools. On desktop it's a sticky sidebar; on mobile it
 * collapses to a fixed bottom bar that opens each panel as a slide-up sheet.
 */
export function PlayerDock({ campaignId }: { campaignId: string }) {
  const [sheet, setSheet] = useState<null | "character" | "dice">(null);

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-20 lg:self-start">
        <MyCharacterPanel campaignId={campaignId} />
        <DicePanel campaignId={campaignId} />
      </aside>

      {/* Mobile: fixed bottom dock */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-ink-800 bg-ink-950/90 p-2 backdrop-blur lg:hidden">
        <button className="btn-ghost flex-1" onClick={() => setSheet("character")}>⚔ Character</button>
        <button className="btn-ghost flex-1" onClick={() => setSheet("dice")}>🎲 Dice</button>
      </div>

      <Modal open={sheet === "character"} onClose={() => setSheet(null)} align="bottom" className="max-w-xl">
        <MyCharacterPanel campaignId={campaignId} />
      </Modal>
      <Modal open={sheet === "dice"} onClose={() => setSheet(null)} align="bottom" className="max-w-xl">
        <DicePanel campaignId={campaignId} />
      </Modal>
    </>
  );
}
