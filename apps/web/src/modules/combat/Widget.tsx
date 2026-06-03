import { useEffect, useState } from "react";
import clsx from "clsx";
import type { Combatant, Encounter } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { HpBar, InlineConfirm } from "../shared.js";
import { useParty } from "../party/api.js";
import { useNpcs } from "../npc/api.js";
import { useMonsters } from "../bestiary/api.js";
import { combatantFromMonster, combatantFromNpc, combatantFromParty } from "./fromLibrary.js";
import {
  useAddCombatant,
  useCreateEncounter,
  useDeleteEncounter,
  useEncounters,
  useNextTurn,
  usePrevTurn,
  useRemoveCombatant,
  useRollInitiative,
  useUpdateCombatant,
  useUpdateEncounter,
} from "./api.js";

function CombatTrackerWidget({ campaignId, state, setState }: WidgetContext) {
  const list = useEncounters(campaignId);
  const create = useCreateEncounter(campaignId);
  const remove = useDeleteEncounter(campaignId);
  const [newName, setNewName] = useState("");

  const selectedId = (state?.selectedEncounterId as string | undefined) ?? null;
  const selected =
    list.data?.find((e) => e.id === selectedId) ??
    list.data?.find((e) => e.active) ??
    list.data?.[0] ??
    null;

  const setSelected = (id: string) => setState({ selectedEncounterId: id });

  const doCreate = () => {
    const name = newName.trim();
    if (!name) return;
    create.mutate({ name }, { onSuccess: (enc) => { setNewName(""); setSelected(enc.id); } });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Top bar: encounter selector + new encounter input */}
      <div className="flex items-center gap-1 border-b border-ink-700 px-2 py-1.5">
        <select
          className="input flex-1"
          value={selected?.id ?? ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="" disabled>
            {list.data?.length ? "Select encounter…" : "No encounters yet"}
          </option>
          {list.data?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.active ? "▶ " : ""}
              {e.name}
            </option>
          ))}
        </select>
        <input
          className="input w-36"
          placeholder="New encounter…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doCreate()}
        />
        <button
          className="btn-primary px-2"
          disabled={create.isPending || !newName.trim()}
          onClick={doCreate}
        >
          +
        </button>
      </div>

      {selected ? (
        <EncounterPane
          encounter={selected}
          campaignId={campaignId}
          onDelete={() => remove.mutate(selected.id)}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-500">
          Create or select an encounter to start tracking initiative.
        </div>
      )}
    </div>
  );
}

interface EncounterPaneProps {
  campaignId: string;
  encounter: Encounter;
  onDelete: () => void;
}

function EncounterPane({ campaignId, encounter, onDelete }: EncounterPaneProps) {
  const update = useUpdateEncounter(campaignId);
  const next = useNextTurn(campaignId);
  const prev = usePrevTurn(campaignId);
  const rollInit = useRollInitiative(campaignId);
  const addCombatant = useAddCombatant(campaignId);
  const updateCombatant = useUpdateCombatant(campaignId);
  const removeCombatant = useRemoveCombatant(campaignId);
  const party = useParty(campaignId);
  const npcs = useNpcs({ campaignId });
  const monsters = useMonsters({ campaignId });
  const [draft, setDraft] = useState({ name: "", initiative: "", isPC: false });
  const [pickSource, setPickSource] = useState<"" | "party" | "npc" | "bestiary">("");

  const pickOptions =
    pickSource === "party"
      ? (party.data ?? []).map((m) => ({ id: m.id, label: m.name }))
      : pickSource === "npc"
        ? (npcs.data ?? []).map((n) => ({ id: n.id, label: n.name }))
        : pickSource === "bestiary"
          ? (monsters.data ?? []).map((mo) => ({ id: mo.id, label: mo.name }))
          : [];

  // Pull a combatant straight out of the party / NPC / bestiary libraries,
  // carrying over HP / max HP / AC (and PC flag for party members).
  const addFromSource = (id: string) => {
    if (!id) return;
    let input: Parameters<typeof addCombatant.mutate>[0]["input"] | null = null;
    if (pickSource === "party") {
      const m = party.data?.find((x) => x.id === id);
      if (m) input = combatantFromParty(m);
    } else if (pickSource === "npc") {
      const n = npcs.data?.find((x) => x.id === id);
      if (n) input = combatantFromNpc(n);
    } else if (pickSource === "bestiary") {
      const mo = monsters.data?.find((x) => x.id === id);
      if (mo) input = combatantFromMonster(mo);
    }
    if (input) addCombatant.mutate({ encounterId: encounter.id, input });
  };

  // Re-number `order` so the list is sorted by initiative (desc), persisting
  // each changed combatant so the new ordering sticks across reloads.
  const sortByInitiative = () => {
    const sorted = [...encounter.combatants].sort((a, b) => b.initiative - a.initiative);
    sorted.forEach((c, idx) => {
      if (c.order !== idx) {
        updateCombatant.mutate({ encounterId: encounter.id, id: c.id, input: { order: idx } });
      }
    });
  };

  const moveCombatant = (index: number, dir: -1 | 1) => {
    const list = encounter.combatants;
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[index];
    const b = list[target];
    if (!a || !b) return;
    updateCombatant.mutate({ encounterId: encounter.id, id: a.id, input: { order: b.order } });
    updateCombatant.mutate({ encounterId: encounter.id, id: b.id, input: { order: a.order } });
  };

  const submitCombatant = () => {
    const name = draft.name.trim();
    const initiative = Number(draft.initiative);
    if (!name || Number.isNaN(initiative)) return;
    addCombatant.mutate(
      { encounterId: encounter.id, input: { name, initiative, isPC: draft.isPC } },
      { onSuccess: () => setDraft({ name: "", initiative: "", isPC: false }) },
    );
  };

  const isActive = encounter.active;
  const hasCombatants = encounter.combatants.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Controls bar */}
      <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-900/50 px-2 py-1.5 text-sm">
        <button
          className={clsx("btn px-3", isActive ? "btn-danger" : "btn-primary")}
          onClick={() => update.mutate({ id: encounter.id, input: { active: !isActive } })}
        >
          {isActive ? "End combat" : "Start combat"}
        </button>
        <button
          className="btn-ghost px-2 font-medium"
          disabled={!hasCombatants}
          onClick={() => prev.mutate(encounter.id)}
          title="Back to previous turn"
        >
          ← Prev
        </button>
        <button
          className={clsx(
            "btn-ghost px-3 font-medium",
            isActive && hasCombatants && "text-accent-500 ring-1 ring-accent-500/50",
          )}
          disabled={!hasCombatants}
          onClick={() => next.mutate(encounter.id)}
          title="Advance to next turn (N)"
        >
          Next turn →
        </button>
        <button
          className="btn-ghost px-2 text-xs"
          disabled={!hasCombatants || rollInit.isPending}
          onClick={() => rollInit.mutate({ encounterId: encounter.id, onlyNpc: true })}
          title="Roll 1d20 initiative for all non-PC combatants"
        >
          🎲 Init (NPCs)
        </button>
        <button
          className="btn-ghost px-2 text-xs"
          disabled={!hasCombatants}
          onClick={sortByInitiative}
          title="Sort combatants by initiative (high to low)"
        >
          Sort
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs text-ink-400">
          <span>
            Round{" "}
            <span className={clsx("font-mono font-bold", isActive ? "text-accent-500" : "text-ink-100")}>
              {encounter.round}
            </span>
          </span>
          <span>
            {hasCombatants
              ? `${(encounter.currentTurn % encounter.combatants.length) + 1}/${encounter.combatants.length}`
              : "—"}
          </span>
          <InlineConfirm onConfirm={onDelete} title="Delete encounter" />
        </div>
      </div>

      {/* Combatant list */}
      <ul className="flex-1 overflow-auto px-2 py-1.5 space-y-1.5">
        {encounter.combatants.map((c, idx) => (
          <CombatantRow
            key={c.id}
            combatant={c}
            isCurrent={idx === encounter.currentTurn && isActive}
            onChange={(input) =>
              updateCombatant.mutate({ encounterId: encounter.id, id: c.id, input })
            }
            onRemove={() => removeCombatant.mutate({ encounterId: encounter.id, id: c.id })}
            onMove={(dir) => moveCombatant(idx, dir)}
          />
        ))}
        {!hasCombatants && (
          <li className="py-4 text-center text-sm text-ink-500">
            No combatants — add one below.
          </li>
        )}
      </ul>

      {/* Add from party / NPC / bestiary */}
      <div className="flex items-center gap-1 border-t border-ink-700 bg-ink-900/50 px-2 py-1.5">
        <span className="shrink-0 text-xs text-ink-500">Add from</span>
        <select
          className="input w-24"
          value={pickSource}
          onChange={(e) => setPickSource(e.target.value as typeof pickSource)}
        >
          <option value="">—</option>
          <option value="party">Party</option>
          <option value="npc">NPC</option>
          <option value="bestiary">Bestiary</option>
        </select>
        <select
          className="input flex-1"
          value=""
          disabled={!pickSource || pickOptions.length === 0}
          onChange={(e) => {
            addFromSource(e.target.value);
            e.currentTarget.selectedIndex = 0;
          }}
        >
          <option value="">
            {!pickSource
              ? "Pick a source first…"
              : pickOptions.length === 0
                ? "Nothing in this library"
                : "Select to add…"}
          </option>
          {pickOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Add combatant row */}
      <div className="flex items-center gap-1 border-t border-ink-700 bg-ink-900/50 px-2 py-1.5">
        <input
          type="number"
          className="input w-16 text-center font-mono"
          placeholder="Init"
          value={draft.initiative}
          onChange={(e) => setDraft({ ...draft, initiative: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && submitCombatant()}
          title="Initiative"
        />
        <input
          className="input flex-1"
          placeholder="Name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && submitCombatant()}
        />
        <label className="flex cursor-pointer items-center gap-1 text-xs text-ink-300 select-none">
          <input
            type="checkbox"
            checked={draft.isPC}
            onChange={(e) => setDraft({ ...draft, isPC: e.target.checked })}
          />
          PC
        </label>
        <button
          className="btn-primary px-2"
          onClick={submitCombatant}
          disabled={!draft.name.trim() || draft.initiative === ""}
        >
          Add
        </button>
      </div>
    </div>
  );
}

interface CombatantRowProps {
  combatant: Combatant;
  isCurrent: boolean;
  onChange: (
    input: Parameters<ReturnType<typeof useUpdateCombatant>["mutate"]>[0]["input"],
  ) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

function CombatantRow({ combatant, isCurrent, onChange, onRemove, onMove }: CombatantRowProps) {
  const [localName, setLocalName] = useState(combatant.name);
  const [localInit, setLocalInit] = useState(combatant.initiative);
  const [localHp, setLocalHp] = useState(combatant.hp ?? 0);
  const [localHpMax, setLocalHpMax] = useState(combatant.hpMax ?? 0);
  const [localAc, setLocalAc] = useState(combatant.ac ?? 0);
  const [localConditions, setLocalConditions] = useState(combatant.conditions.join(", "));
  const [localNotes, setLocalNotes] = useState(combatant.notes ?? "");
  const [dmgInput, setDmgInput] = useState("");

  useEffect(() => setLocalHp(combatant.hp ?? 0), [combatant.hp]);
  useEffect(() => setLocalHpMax(combatant.hpMax ?? 0), [combatant.hpMax]);
  useEffect(() => setLocalAc(combatant.ac ?? 0), [combatant.ac]);
  useEffect(() => setLocalConditions(combatant.conditions.join(", ")), [combatant.conditions]);
  useEffect(() => setLocalNotes(combatant.notes ?? ""), [combatant.notes]);

  const applyDamage = (sign: 1 | -1) => {
    const n = Number(dmgInput);
    if (!n || Number.isNaN(n)) return;
    const next = Math.max(0, localHp + sign * -n); // damage reduces HP
    setLocalHp(next);
    onChange({ hp: next });
    setDmgInput("");
  };

  const stepHp = (delta: number) => {
    const next = Math.max(0, localHp + delta);
    setLocalHp(next);
    onChange({ hp: next });
  };

  return (
    <li
      className={clsx(
        "rounded-md border px-2 py-2 transition-colors",
        combatant.defeated
          ? "border-ink-800 bg-ink-950 opacity-60"
          : isCurrent
            ? "border-accent-500 bg-accent-500/10 shadow-[inset_3px_0_0_theme(colors.accent.500)]"
            : "border-ink-700 bg-ink-900",
      )}
    >
      {/* Name + initiative + badges */}
      <div className="flex items-center gap-1.5">
        {isCurrent && !combatant.defeated && (
          <span className="text-xs font-bold text-accent-500 shrink-0">▶</span>
        )}
        <div className="flex shrink-0 flex-col">
          <button
            className="h-3 leading-none text-[10px] text-ink-500 hover:text-ink-200"
            onClick={() => onMove(-1)}
            title="Move up"
          >
            ▲
          </button>
          <button
            className="h-3 leading-none text-[10px] text-ink-500 hover:text-ink-200"
            onClick={() => onMove(1)}
            title="Move down"
          >
            ▼
          </button>
        </div>
        <input
          type="number"
          className="input w-14 text-center font-mono text-sm"
          value={localInit}
          onChange={(e) => setLocalInit(Number(e.target.value))}
          onBlur={() => localInit !== combatant.initiative && onChange({ initiative: localInit })}
          title="Initiative"
        />
        <input
          className={clsx(
            "input flex-1",
            combatant.isPC && "font-medium text-sky-300",
            combatant.defeated && "line-through",
          )}
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => localName !== combatant.name && onChange({ name: localName })}
        />
        {combatant.isPC && (
          <span className="shrink-0 rounded-full bg-sky-800/60 px-2 py-0.5 text-xs text-sky-300">
            PC
          </span>
        )}
        <button
          className={clsx(
            "btn-ghost h-6 px-1.5 text-xs",
            combatant.defeated ? "text-emerald-400" : "text-ink-500 hover:text-red-400",
          )}
          onClick={() => onChange({ defeated: !combatant.defeated })}
          title={combatant.defeated ? "Revive" : "Mark defeated"}
        >
          {combatant.defeated ? "Revive" : "💀"}
        </button>
        <InlineConfirm onConfirm={onRemove} title="Remove combatant" />
      </div>

      {/* HP row */}
      <div className="mt-1.5 flex items-center gap-1">
        <button className="btn-ghost h-6 w-6 p-0 text-base leading-none" onClick={() => stepHp(-1)} title="−1 HP">−</button>
        <input
          type="number"
          className="input w-14 text-center font-mono text-xs"
          value={localHp}
          onChange={(e) => setLocalHp(Number(e.target.value))}
          onBlur={() => localHp !== (combatant.hp ?? 0) && onChange({ hp: localHp })}
          title="HP"
        />
        <span className="text-ink-600">/</span>
        <input
          type="number"
          className="input w-14 text-center font-mono text-xs text-ink-400"
          value={localHpMax}
          onChange={(e) => setLocalHpMax(Number(e.target.value))}
          onBlur={() => localHpMax !== (combatant.hpMax ?? 0) && onChange({ hpMax: localHpMax })}
          title="Max HP"
        />
        {/* Quick damage input */}
        <span className="ml-1 text-xs text-ink-600">dmg</span>
        <input
          type="number"
          className="input w-14 text-center font-mono text-xs"
          placeholder="0"
          value={dmgInput}
          onChange={(e) => setDmgInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyDamage(1);
          }}
          title="Enter damage amount, Enter to apply, + to heal"
        />
        <button
          className="btn-ghost h-6 px-1.5 text-xs text-red-400 hover:text-red-300"
          onClick={() => applyDamage(1)}
          title="Apply damage"
          disabled={!dmgInput}
        >
          Dmg
        </button>
        <button
          className="btn-ghost h-6 px-1.5 text-xs text-emerald-400 hover:text-emerald-300"
          onClick={() => applyDamage(-1)}
          title="Heal"
          disabled={!dmgInput}
        >
          Heal
        </button>
        <span className="ml-auto text-xs text-ink-600">AC</span>
        <input
          type="number"
          className="input w-12 text-center font-mono text-xs"
          value={localAc}
          onChange={(e) => setLocalAc(Number(e.target.value))}
          onBlur={() => localAc !== (combatant.ac ?? 0) && onChange({ ac: localAc })}
          title="Armor Class"
        />
      </div>

      {/* HP bar */}
      <div className="mt-1">
        <HpBar hp={combatant.hp} hpMax={combatant.hpMax} />
      </div>

      {/* Conditions */}
      <input
        className="input mt-1.5 text-xs"
        placeholder="Conditions (comma-separated)…"
        value={localConditions}
        onChange={(e) => setLocalConditions(e.target.value)}
        onBlur={(e) =>
          onChange({
            conditions: e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />

      {/* GM notes */}
      <input
        className="input mt-1 text-xs text-ink-400"
        placeholder="GM notes (hidden from players)…"
        value={localNotes}
        onChange={(e) => setLocalNotes(e.target.value)}
        onBlur={() =>
          localNotes !== (combatant.notes ?? "") && onChange({ notes: localNotes || undefined })
        }
      />
    </li>
  );
}

registerWidget({
  type: "combat",
  title: "Combat Tracker",
  defaultSize: { w: 520, h: 460 },
  broadcastKey: "combat",
  Component: CombatTrackerWidget,
});

export {};
