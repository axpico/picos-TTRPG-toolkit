import { ABILITY_KEYS, abilityMod, formatMod, type StatBlock } from "@toolkit/shared";

const ABILITY_LABEL: Record<string, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

function Line({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="text-sm leading-snug">
      <span className="font-semibold text-ink-200">{label} </span>
      <span className="text-ink-300">{value}</span>
    </p>
  );
}

function EntryList({ title, entries }: { title: string; entries: StatBlock["actions"] }) {
  if (entries.length === 0) return null;
  return (
    <section className="mt-3">
      <h4 className="display mb-1 border-b border-accent-500/30 pb-0.5 text-sm font-semibold uppercase tracking-wide text-accent-400">
        {title}
      </h4>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <p key={e.id} className="text-sm leading-snug text-ink-300">
            {e.name && <span className="font-semibold italic text-ink-100">{e.name}. </span>}
            {e.desc}
          </p>
        ))}
      </div>
    </section>
  );
}

/** Classic D&D-style read-only stat block card. */
export function StatBlockView({
  stats,
  name,
  cr,
  meta,
  portraitUrl,
}: {
  stats: StatBlock;
  name?: string;
  cr?: string | null;
  meta?: string | null;
  portraitUrl?: string | null;
}) {
  const crValue = stats.cr ?? cr ?? null;
  const topLine = [
    stats.level != null ? `Level ${stats.level}` : null,
    crValue ? `CR ${crValue}` : null,
    stats.ac != null ? `AC ${stats.ac}` : null,
    stats.hp != null ? `HP ${stats.hp}${stats.hpMax ? `/${stats.hpMax}` : ""}` : null,
    stats.speed ? `Speed ${stats.speed}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");

  return (
    <div className="rounded-lg border border-amber-500/30 bg-ink-900/60 p-4">
      <header className="flex items-start gap-3 border-b-2 border-amber-500/40 pb-2">
        {portraitUrl && (
          <img src={portraitUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
        )}
        <div className="min-w-0">
          {name && <h3 className="display text-lg font-semibold text-amber-300">{name}</h3>}
          {meta && <p className="text-xs italic text-ink-400">{meta}</p>}
        </div>
      </header>

      {topLine && <p className="mt-2 text-sm font-medium text-ink-200">{topLine}</p>}

      {/* Ability grid */}
      <div className="mt-3 grid grid-cols-6 gap-1 rounded-md border border-ink-700 bg-ink-950/40 p-2 text-center">
        {ABILITY_KEYS.map((k) => {
          const score = stats.abilities[k];
          const mod = abilityMod(score);
          return (
            <div key={k}>
              <div className="text-[10px] font-semibold uppercase text-accent-400">{ABILITY_LABEL[k]}</div>
              <div className="text-sm font-medium text-ink-100">{score ?? "—"}</div>
              <div className="text-[11px] text-ink-400">{formatMod(mod)}</div>
            </div>
          );
        })}
      </div>

      {/* Text lines */}
      <div className="mt-3 space-y-0.5">
        <Line label="Saving Throws" value={stats.saves} />
        <Line label="Skills" value={stats.skills} />
        <Line label="Senses" value={stats.senses} />
        <Line label="Languages" value={stats.languages} />
        <Line label="Damage Resistances" value={stats.damageResistances} />
        <Line label="Damage Immunities" value={stats.damageImmunities} />
        <Line label="Condition Immunities" value={stats.conditionImmunities} />
        {stats.profBonus != null && <Line label="Proficiency Bonus" value={formatMod(stats.profBonus)} />}
      </div>

      <EntryList title="Traits" entries={stats.traits} />
      <EntryList title="Actions" entries={stats.actions} />
      <EntryList title="Reactions" entries={stats.reactions} />
      <EntryList title="Legendary Actions" entries={stats.legendary} />
    </div>
  );
}
