import { useState } from "react";
import { ARCHETYPES, buildStatBlock, type Archetype, type SheetKind, type StatBlock } from "@toolkit/shared";

const ARCHETYPE_HINT: Record<Archetype, string> = {
  brute: "high STR/CON, heavy melee",
  skirmisher: "high DEX, fast & mobile",
  caster: "high INT, ranged magic",
  leader: "high CHA, buffs & commands",
  lurker: "high DEX/WIS, stealth & ambush",
};

/**
 * Compact deterministic generator embedded in the stat-block editor. Pick a
 * power level + archetype and it overwrites the stat block with consistent
 * AC/HP/abilities/attack via the shared {@link buildStatBlock}. Flavor text
 * (name/quirk/hook) comes from the entity's own generator, not here.
 */
export function StatBlockGenerator({
  kind,
  onGenerate,
}: {
  kind: SheetKind;
  onGenerate: (next: StatBlock) => void;
}) {
  const isPlayer = kind === "player";
  const [level, setLevel] = useState(isPlayer ? "3" : "1");
  const [archetype, setArchetype] = useState<Archetype>("brute");

  const run = () => {
    onGenerate(buildStatBlock({ kind, crOrLevel: level.trim() || "1", archetype }));
  };

  return (
    <div className="rounded-lg border border-accent-700/40 bg-accent-900/10 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-300">
        <span>⚄</span> Quick generate
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-500">
            {isPlayer ? "Level" : "Challenge"}
          </span>
          <input
            className="input w-20"
            value={level}
            placeholder={isPlayer ? "3" : "1/2"}
            onChange={(e) => setLevel(e.target.value)}
          />
        </label>
        <label className="flex flex-1 flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-500">Archetype</span>
          <select
            className="input"
            value={archetype}
            onChange={(e) => setArchetype(e.target.value as Archetype)}
          >
            {ARCHETYPES.map((a) => (
              <option key={a} value={a}>
                {a} — {ARCHETYPE_HINT[a]}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary h-9 px-3 text-sm" onClick={run} title="Overwrite the stat block">
          Generate
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-500">
        Fills AC, HP, ability scores, saves, and a stock attack. Overwrites current numbers.
      </p>
    </div>
  );
}
