import {
  ABILITY_KEYS,
  abilityMod,
  formatMod,
  type AbilityKey,
  type StatBlock,
  type StatEntry,
} from "@toolkit/shared";

const ABILITY_LABEL: Record<AbilityKey, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

const uid = () => `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const numOrNull = (v: string): number | null => (v === "" ? null : Number(v));

/** Structured editor for a creature stat block. */
export function StatBlockEditor({
  value,
  onChange,
  hideHp = false,
}: {
  value: StatBlock;
  onChange: (next: StatBlock) => void;
  hideHp?: boolean;
}) {
  const set = (patch: Partial<StatBlock>) => onChange({ ...value, ...patch });
  const setAbility = (k: AbilityKey, n: number | null) =>
    set({ abilities: { ...value.abilities, [k]: n } });

  return (
    <div className="space-y-4">
      {/* Core combat numbers */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumField label="AC" value={value.ac} onChange={(n) => set({ ac: n })} />
        {!hideHp && <NumField label="HP" value={value.hp} onChange={(n) => set({ hp: n })} />}
        {!hideHp && <NumField label="Max HP" value={value.hpMax} onChange={(n) => set({ hpMax: n })} />}
        <NumField label="Prof." value={value.profBonus} onChange={(n) => set({ profBonus: n })} />
        <TextField
          label="Speed"
          value={value.speed}
          onChange={(v) => set({ speed: v })}
          className="col-span-2"
          placeholder="30 ft., fly 60 ft."
        />
      </div>

      {/* Ability scores */}
      <div>
        <Label>Ability scores</Label>
        <div className="grid grid-cols-6 gap-1.5">
          {ABILITY_KEYS.map((k) => {
            const score = value.abilities[k];
            return (
              <label key={k} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-semibold uppercase text-accent-400">{ABILITY_LABEL[k]}</span>
                <input
                  type="number"
                  className="input px-1 text-center"
                  value={score ?? ""}
                  placeholder="—"
                  onChange={(e) => setAbility(k, numOrNull(e.target.value))}
                />
                <span className="text-[10px] text-ink-500">{formatMod(abilityMod(score))}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Text fields */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TextField label="Saving Throws" value={value.saves} onChange={(v) => set({ saves: v })} placeholder="DEX +5, CON +3" />
        <TextField label="Skills" value={value.skills} onChange={(v) => set({ skills: v })} placeholder="Perception +4, Stealth +6" />
        <TextField label="Senses" value={value.senses} onChange={(v) => set({ senses: v })} placeholder="darkvision 60 ft., passive Perception 14" />
        <TextField label="Languages" value={value.languages} onChange={(v) => set({ languages: v })} placeholder="Common, Draconic" />
        <TextField label="Damage Resistances" value={value.damageResistances} onChange={(v) => set({ damageResistances: v })} />
        <TextField label="Damage Immunities" value={value.damageImmunities} onChange={(v) => set({ damageImmunities: v })} />
        <TextField label="Condition Immunities" value={value.conditionImmunities} onChange={(v) => set({ conditionImmunities: v })} className="sm:col-span-2" />
      </div>

      {/* Repeatable entry sections */}
      <EntryEditor label="Traits" entries={value.traits} onChange={(traits) => set({ traits })} />
      <EntryEditor label="Actions" entries={value.actions} onChange={(actions) => set({ actions })} />
      <EntryEditor label="Reactions" entries={value.reactions} onChange={(reactions) => set({ reactions })} />
      <EntryEditor label="Legendary Actions" entries={value.legendary} onChange={(legendary) => set({ legendary })} />
    </div>
  );
}

function EntryEditor({
  label,
  entries,
  onChange,
}: {
  label: string;
  entries: StatEntry[];
  onChange: (next: StatEntry[]) => void;
}) {
  const add = () => onChange([...entries, { id: uid(), name: "", desc: "" }]);
  const update = (id: string, patch: Partial<StatEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) => onChange(entries.filter((e) => e.id !== id));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label>{label}</Label>
        <button className="btn-ghost px-2 py-0.5 text-xs" onClick={add}>
          + Add
        </button>
      </div>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.id} className="rounded-md border border-ink-700 bg-ink-900 p-1.5">
            <div className="flex items-center gap-1.5">
              <input
                className="input flex-1"
                value={e.name}
                placeholder="Name (e.g. Multiattack)"
                onChange={(ev) => update(e.id, { name: ev.target.value })}
              />
              <button className="btn-ghost px-1.5 py-1" onClick={() => remove(e.id)} title="Remove">
                ×
              </button>
            </div>
            <textarea
              className="input mt-1 min-h-[44px]"
              value={e.desc}
              placeholder="Description"
              onChange={(ev) => update(e.id, { desc: ev.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">{children}</div>;
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-ink-500">{label}</span>
      <input
        type="number"
        className="input"
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => onChange(numOrNull(e.target.value))}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 ${className ?? ""}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-ink-500">{label}</span>
      <input
        className="input"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      />
    </label>
  );
}
