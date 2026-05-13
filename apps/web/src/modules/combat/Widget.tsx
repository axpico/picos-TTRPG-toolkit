import { useState } from "react";
import clsx from "clsx";
import type { Combatant, Encounter } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import {
  useAddCombatant,
  useCreateEncounter,
  useDeleteEncounter,
  useEncounters,
  useNextTurn,
  useRemoveCombatant,
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

  return (
    <div className="flex h-full flex-col">
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
          className="input w-32"
          placeholder="New encounter…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              const name = newName.trim();
              create.mutate(
                { name },
                {
                  onSuccess: (enc) => {
                    setNewName("");
                    setSelected(enc.id);
                  },
                },
              );
            }
          }}
        />
        <button
          className="btn-primary px-2"
          disabled={create.isPending || !newName.trim()}
          onClick={() => {
            const name = newName.trim();
            if (!name) return;
            create.mutate(
              { name },
              {
                onSuccess: (enc) => {
                  setNewName("");
                  setSelected(enc.id);
                },
              },
            );
          }}
        >
          +
        </button>
      </div>

      {selected ? (
        <EncounterPane
          encounter={selected}
          campaignId={campaignId}
          onDelete={() => {
            if (confirm(`Delete encounter "${selected.name}"?`)) remove.mutate(selected.id);
          }}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-400">
          Create an encounter to start tracking initiative.
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
  const addCombatant = useAddCombatant(campaignId);
  const updateCombatant = useUpdateCombatant(campaignId);
  const removeCombatant = useRemoveCombatant(campaignId);
  const [draft, setDraft] = useState<{ name: string; initiative: string; isPC: boolean }>({
    name: "",
    initiative: "",
    isPC: false,
  });

  const submitCombatant = () => {
    const name = draft.name.trim();
    const initiative = Number(draft.initiative);
    if (!name || Number.isNaN(initiative)) return;
    addCombatant.mutate(
      { encounterId: encounter.id, input: { name, initiative, isPC: draft.isPC } },
      { onSuccess: () => setDraft({ name: "", initiative: "", isPC: false }) },
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-700 px-2 py-1.5 text-sm">
        <button
          className={clsx("btn px-2", encounter.active ? "btn-danger" : "btn-primary")}
          onClick={() => update.mutate({ id: encounter.id, input: { active: !encounter.active } })}
        >
          {encounter.active ? "End" : "Start"}
        </button>
        <button
          className="btn-ghost px-2"
          disabled={!encounter.combatants.length}
          onClick={() => next.mutate(encounter.id)}
        >
          Next turn →
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-ink-400">
          <span>
            Round <span className="text-ink-100">{encounter.round}</span>
          </span>
          <span>
            Turn{" "}
            <span className="text-ink-100">
              {encounter.combatants.length
                ? `${encounter.currentTurn + 1}/${encounter.combatants.length}`
                : "—"}
            </span>
          </span>
          <button className="btn-ghost px-2" onClick={onDelete} title="Delete encounter">
            ×
          </button>
        </div>
      </div>

      <ul className="flex-1 overflow-auto px-2 py-1.5">
        {encounter.combatants.map((c, idx) => (
          <CombatantRow
            key={c.id}
            combatant={c}
            isCurrent={idx === encounter.currentTurn && encounter.active}
            onChange={(input) =>
              updateCombatant.mutate({ encounterId: encounter.id, id: c.id, input })
            }
            onRemove={() => removeCombatant.mutate({ encounterId: encounter.id, id: c.id })}
          />
        ))}
        {encounter.combatants.length === 0 && (
          <li className="py-2 text-center text-sm text-ink-400">No combatants yet.</li>
        )}
      </ul>

      <div className="flex items-center gap-1 border-t border-ink-700 px-2 py-1.5">
        <input
          type="number"
          className="input w-16"
          placeholder="Init"
          value={draft.initiative}
          onChange={(e) => setDraft({ ...draft, initiative: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && submitCombatant()}
        />
        <input
          className="input flex-1"
          placeholder="Combatant name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && submitCombatant()}
        />
        <label className="flex items-center gap-1 text-xs text-ink-300">
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

interface RowProps {
  combatant: Combatant;
  isCurrent: boolean;
  onChange: (input: Parameters<ReturnType<typeof useUpdateCombatant>["mutate"]>[0]["input"]) => void;
  onRemove: () => void;
}

function CombatantRow({ combatant, isCurrent, onChange, onRemove }: RowProps) {
  return (
    <li
      className={clsx(
        "mb-1 rounded-md border px-2 py-1.5",
        isCurrent
          ? "border-accent-500 bg-accent-500/10"
          : "border-ink-700 bg-ink-900",
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="input w-14 text-right"
          value={combatant.initiative}
          onChange={(e) => onChange({ initiative: Number(e.target.value) })}
          title="Initiative"
        />
        <input
          className="input flex-1"
          value={combatant.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <input
          type="number"
          className="input w-14 text-right"
          placeholder="HP"
          value={combatant.hp ?? ""}
          onChange={(e) =>
            onChange({ hp: e.target.value === "" ? undefined : Number(e.target.value) })
          }
        />
        <span className="text-ink-500">/</span>
        <input
          type="number"
          className="input w-14 text-right"
          placeholder="Max"
          value={combatant.hpMax ?? ""}
          onChange={(e) =>
            onChange({ hpMax: e.target.value === "" ? undefined : Number(e.target.value) })
          }
        />
        {combatant.isPC && <span className="chip">PC</span>}
        <button className="btn-ghost px-2" onClick={onRemove} title="Remove">
          ×
        </button>
      </div>
      <input
        className="input mt-1 text-xs"
        placeholder="Conditions (comma-separated)"
        value={combatant.conditions.join(", ")}
        onChange={(e) =>
          onChange({
            conditions: e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />
    </li>
  );
}

registerWidget({
  type: "combat",
  title: "Combat Tracker",
  defaultSize: { w: 460, h: 420 },
  broadcastKey: "combat",
  Component: CombatTrackerWidget,
});

export {};
