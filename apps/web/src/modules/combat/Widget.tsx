import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type {
  Combatant,
  Encounter,
  StatBlock,
  UpdateCombatantInput,
  UpdatePartyMemberInput,
} from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useWidgetState } from "../../canvas/useWidgetState.js";
import { HpBar, InlineConfirm, PendingButton, StatusBadge } from "../shared.js";
import { Skeleton } from "../../components/Skeleton.js";
import { EmptyState } from "../../components/EmptyState.js";
import { CreatureSheetModal } from "../../components/statblock/CreatureSheetModal.js";
import { useParty, useUpdatePartyMember } from "../party/api.js";
import { useAdvanceCalendar } from "../calendar/api.js";
import { useNpcs } from "../npc/api.js";
import { useMonsters } from "../bestiary/api.js";
import { CONDITIONS } from "./conditions.js";
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

  const [{ selectedEncounterId: selectedId, advanceWorldTime }, patch] = useWidgetState(
    { state, setState },
    { selectedEncounterId: null as string | null, advanceWorldTime: false },
  );
  const selected =
    list.data?.find((e) => e.id === selectedId) ??
    list.data?.find((e) => e.active) ??
    list.data?.[0] ??
    null;

  const setSelected = (id: string) => patch({ selectedEncounterId: id });

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
        <PendingButton
          className="btn-primary px-2"
          pending={create.isPending}
          disabled={!newName.trim()}
          onClick={doCreate}
          aria-label="Create encounter"
        >
          +
        </PendingButton>
      </div>

      {list.isLoading ? (
        <div className="space-y-2 p-3" aria-hidden="true">
          <Skeleton className="h-8" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : selected ? (
        <EncounterPane
          encounter={selected}
          campaignId={campaignId}
          advanceWorldTime={advanceWorldTime}
          onToggleAdvanceWorldTime={(v) => patch({ advanceWorldTime: v })}
          onDelete={() => remove.mutate(selected.id)}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-3">
          <EmptyState
            compact
            icon="⚔️"
            title="No encounter selected"
            description="Create or select an encounter to start tracking initiative."
          />
        </div>
      )}
    </div>
  );
}

interface EncounterPaneProps {
  campaignId: string;
  encounter: Encounter;
  advanceWorldTime: boolean;
  onToggleAdvanceWorldTime: (value: boolean) => void;
  onDelete: () => void;
}

function EncounterPane({
  campaignId,
  encounter,
  advanceWorldTime,
  onToggleAdvanceWorldTime,
  onDelete,
}: EncounterPaneProps) {
  const update = useUpdateEncounter(campaignId);
  const next = useNextTurn(campaignId);
  const prev = usePrevTurn(campaignId);
  const advanceCalendar = useAdvanceCalendar(campaignId);
  const rollInit = useRollInitiative(campaignId);
  const addCombatant = useAddCombatant(campaignId);
  const updateCombatant = useUpdateCombatant(campaignId);
  const removeCombatant = useRemoveCombatant(campaignId);
  const updatePartyMember = useUpdatePartyMember(campaignId);
  const party = useParty(campaignId);
  const npcs = useNpcs({ campaignId });
  const monsters = useMonsters({ campaignId });
  const [draft, setDraft] = useState({ name: "", initiative: "", isPC: false });
  const [pickSource, setPickSource] = useState<"" | "party" | "npc" | "bestiary">("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

  const isActive = encounter.active;
  const hasCombatants = encounter.combatants.length > 0;

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

  // Move a combatant from one position to another, re-numbering `order` across
  // the list so the new arrangement persists. Used by drag-to-reorder.
  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const arr = [...encounter.combatants];
    const [moved] = arr.splice(from, 1);
    if (!moved) return;
    arr.splice(to, 0, moved);
    arr.forEach((c, idx) => {
      if (c.order !== idx) {
        updateCombatant.mutate({ encounterId: encounter.id, id: c.id, input: { order: idx } });
      }
    });
  };

  const onDrop = (target: number) => {
    if (dragIndex !== null) reorder(dragIndex, target);
    setDragIndex(null);
    setOverIndex(null);
  };

  // Mirror a PC combatant's HP changes back onto the matching party member so the
  // Party Tracker stays in sync. Combatants pulled from the party share its name,
  // so we match on name within this campaign — but only sync when exactly one
  // party member matches, to avoid clobbering the wrong character.
  const syncToParty = (combatant: Combatant, input: UpdateCombatantInput) => {
    if (!combatant.isPC) return;
    if (input.hp === undefined && input.hpMax === undefined) return;
    const name = combatant.name.trim().toLowerCase();
    const matches = (party.data ?? []).filter((m) => m.name.trim().toLowerCase() === name);
    if (matches.length !== 1) return;
    const patch: UpdatePartyMemberInput = {};
    if (input.hp !== undefined) patch.hp = input.hp;
    if (input.hpMax !== undefined) patch.hpMax = input.hpMax;
    updatePartyMember.mutate({ id: matches[0]!.id, input: patch });
  };

  const changeCombatant = (combatant: Combatant, input: UpdateCombatantInput) => {
    updateCombatant.mutate({ encounterId: encounter.id, id: combatant.id, input });
    syncToParty(combatant, input);
  };

  // Latest round/toggle, mirrored into a ref so the keyboard handler (whose
  // effect only re-subscribes on encounter.id) reads fresh values rather than
  // a stale closure.
  const nextRef = useRef({ round: encounter.round, advanceWorldTime });
  nextRef.current = { round: encounter.round, advanceWorldTime };

  // Advance to the next turn. When the GM has opted into "advance world time",
  // each combat round that elapses pushes the in-world clock forward by one
  // round (6s) via the Calendar module's own advance endpoint (which logs).
  const doNext = () => {
    const { round: prevRound, advanceWorldTime: advance } = nextRef.current;
    next.mutate(encounter.id, {
      onSuccess: (enc) => {
        if (!advance) return;
        const rounds = enc.round - prevRound;
        if (rounds > 0) advanceCalendar.mutate({ rounds });
      },
    });
  };

  // Find the library entity (party member / NPC / monster) a combatant was drawn
  // from, by name, so we can show its character sheet. Returns null when nothing
  // with a stat block matches.
  const resolveSheet = (combatant: Combatant): SheetInfo | null => {
    const name = combatant.name.trim().toLowerCase();
    const byName = <T extends { name: string }>(items: T[] | undefined) =>
      (items ?? []).find((x) => x.name.trim().toLowerCase() === name);
    if (combatant.isPC) {
      const m = byName(party.data);
      if (m)
        return {
          title: m.name,
          subtitle: m.playerName ? `Played by ${m.playerName}` : null,
          cr: null,
          stats: m.stats,
        };
    }
    const n = byName(npcs.data);
    if (n) return { title: n.name, subtitle: n.role, cr: null, stats: n.stats };
    const mo = byName(monsters.data);
    if (mo) return { title: mo.name, subtitle: mo.type, cr: mo.challenge, stats: mo.stats };
    return null;
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

  // Keyboard shortcuts, scoped to when the pointer is over this widget so multiple
  // trackers on the canvas don't fight. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!rootRef.current?.matches(":hover")) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      if (!hasCombatants) return;
      const k = e.key.toLowerCase();
      if (k === "n" || e.key === "ArrowRight") {
        e.preventDefault();
        doNext();
      } else if (k === "p" || e.key === "ArrowLeft") {
        e.preventDefault();
        prev.mutate(encounter.id);
      } else if (k === "r") {
        e.preventDefault();
        rollInit.mutate({ encounterId: encounter.id, onlyNpc: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounter.id, hasCombatants]);

  const count = encounter.combatants.length;
  const turnNumber = hasCombatants ? (encounter.currentTurn % count) + 1 : 0;
  const currentName = hasCombatants
    ? encounter.combatants[encounter.currentTurn % count]?.name ?? ""
    : "";

  return (
    <div ref={rootRef} className="flex flex-1 flex-col overflow-hidden">
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
          title="Back to previous turn (P or ←)"
        >
          ← Prev
        </button>
        <button
          className={clsx(
            "btn-ghost px-3 font-medium",
            isActive && hasCombatants && "text-accent-500 ring-1 ring-accent-500/50",
          )}
          disabled={!hasCombatants}
          onClick={doNext}
          title="Advance to next turn (N or →)"
        >
          Next turn →
        </button>
        <button
          className="btn-ghost px-2 text-xs"
          disabled={!hasCombatants || rollInit.isPending}
          onClick={() => rollInit.mutate({ encounterId: encounter.id, onlyNpc: true })}
          title="Roll 1d20 initiative for all non-PC combatants (R)"
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
        <div className="ml-auto">
          <InlineConfirm onConfirm={onDelete} title="Delete encounter" />
        </div>
      </div>

      {/* Round / turn status strip */}
      <div className="flex items-center gap-3 border-b border-ink-700 bg-ink-950/40 px-2.5 py-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="uppercase tracking-wide text-ink-400">Round</span>
          <span
            className={clsx(
              "font-mono text-sm font-bold",
              isActive ? "text-accent-500" : "text-ink-100",
            )}
          >
            {encounter.round}
          </span>
        </span>
        <span className="text-ink-700">·</span>
        {hasCombatants ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-ink-400">
              Turn{" "}
              <span className="font-mono text-ink-200">
                {turnNumber}/{count}
              </span>
            </span>
            {isActive && currentName && (
              <>
                <span className="text-ink-700">·</span>
                <span className="truncate font-medium text-accent-400" title={currentName}>
                  {currentName}
                </span>
              </>
            )}
          </span>
        ) : (
          <span className="text-ink-500">No combatants</span>
        )}
        <label
          className="ml-auto flex cursor-pointer items-center gap-1 text-ink-400 select-none"
          title="Advance the Calendar's in-world time by one round (6s) each combat round"
        >
          <input
            type="checkbox"
            checked={advanceWorldTime}
            onChange={(e) => onToggleAdvanceWorldTime(e.target.checked)}
          />
          Advance world time
        </label>
      </div>

      {/* Combatant list */}
      <ul className="flex-1 overflow-auto px-2 py-1.5 space-y-1.5">
        {encounter.combatants.map((c, idx) => (
          <CombatantRow
            key={c.id}
            campaignId={campaignId}
            combatant={c}
            sheet={resolveSheet(c)}
            isCurrent={idx === encounter.currentTurn && isActive}
            round={encounter.round}
            isDropTarget={overIndex === idx && dragIndex !== null && dragIndex !== idx}
            isDragging={dragIndex === idx}
            onDragStart={() => setDragIndex(idx)}
            onDragEnter={() => setOverIndex(idx)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDrop={() => onDrop(idx)}
            onChange={(input) => changeCombatant(c, input)}
            onRemove={() => removeCombatant.mutate({ encounterId: encounter.id, id: c.id })}
          />
        ))}
        {!hasCombatants && (
          <li>
            <EmptyState
              compact
              icon="🗡️"
              title="No combatants"
              description="Add one below, or pull from the party, NPCs or bestiary."
            />
          </li>
        )}
      </ul>

      {/* Add from party / NPC / bestiary */}
      <div className="flex items-center gap-1 border-t border-ink-700 bg-ink-900/50 px-2 py-1.5">
        <span className="shrink-0 text-xs text-ink-400">Add from</span>
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
        {pickSource && (
          <select
            className="input flex-1"
            value=""
            disabled={pickOptions.length === 0}
            onChange={(e) => {
              addFromSource(e.target.value);
              e.currentTarget.selectedIndex = 0;
            }}
          >
            <option value="">
              {pickOptions.length === 0 ? "Nothing in this library" : "Select to add…"}
            </option>
            {pickOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
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
        <PendingButton
          className="btn-primary px-2"
          onClick={submitCombatant}
          pending={addCombatant.isPending}
          disabled={!draft.name.trim() || draft.initiative === ""}
        >
          Add
        </PendingButton>
      </div>
    </div>
  );
}

interface SheetInfo {
  title: string;
  subtitle: string | null;
  cr: string | null;
  stats: StatBlock;
}

interface CombatantRowProps {
  campaignId: string;
  combatant: Combatant;
  sheet: SheetInfo | null;
  isCurrent: boolean;
  round: number;
  isDropTarget: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onChange: (
    input: Parameters<ReturnType<typeof useUpdateCombatant>["mutate"]>[0]["input"],
  ) => void;
  onRemove: () => void;
}

function CombatantRow({
  campaignId,
  combatant,
  sheet,
  isCurrent,
  round,
  isDropTarget,
  isDragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onChange,
  onRemove,
}: CombatantRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [localName, setLocalName] = useState(combatant.name);
  const [localInit, setLocalInit] = useState(combatant.initiative);
  const [localHp, setLocalHp] = useState(combatant.hp ?? 0);
  const [localHpMax, setLocalHpMax] = useState(combatant.hpMax ?? 0);
  const [localAc, setLocalAc] = useState(combatant.ac ?? 0);
  const [localNotes, setLocalNotes] = useState(combatant.notes ?? "");
  const [dmgInput, setDmgInput] = useState("");

  const rowRef = useRef<HTMLLIElement>(null);

  useEffect(() => setLocalName(combatant.name), [combatant.name]);
  useEffect(() => setLocalInit(combatant.initiative), [combatant.initiative]);
  useEffect(() => setLocalHp(combatant.hp ?? 0), [combatant.hp]);
  useEffect(() => setLocalHpMax(combatant.hpMax ?? 0), [combatant.hpMax]);
  useEffect(() => setLocalAc(combatant.ac ?? 0), [combatant.ac]);
  useEffect(() => setLocalNotes(combatant.notes ?? ""), [combatant.notes]);

  // Auto-expand and scroll the active combatant into view as turns advance.
  useEffect(() => {
    if (isCurrent) {
      setExpanded(true);
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrent, round]);

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

  const setConditions = (conditions: string[]) => onChange({ conditions });

  return (
    <li
      ref={rowRef}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={clsx(
        "rounded-md border px-2 py-1.5 transition-colors",
        isDragging && "opacity-40",
        isDropTarget && "border-accent-500 ring-1 ring-accent-500",
        !isDropTarget &&
          (combatant.defeated
            ? "border-ink-800 bg-ink-950 opacity-60"
            : isCurrent
              ? "border-accent-500 bg-accent-500/10 shadow-[inset_3px_0_0_theme(colors.accent.500)]"
              : "border-ink-700 bg-ink-900"),
      )}
    >
      {/* Compact header — enough to run a turn without expanding */}
      <div className="flex items-center gap-1.5">
        <span
          className="shrink-0 cursor-grab select-none px-0.5 text-ink-500 hover:text-ink-300 active:cursor-grabbing"
          title="Drag to reorder"
        >
          ⠿
        </span>
        {isCurrent && !combatant.defeated && (
          <span className="shrink-0 text-xs font-bold text-accent-500">▶</span>
        )}
        <input
          type="number"
          className="input w-12 shrink-0 px-1 text-center font-mono text-sm"
          value={localInit}
          onChange={(e) => setLocalInit(Number(e.target.value))}
          onBlur={() => localInit !== combatant.initiative && onChange({ initiative: localInit })}
          title="Initiative"
        />
        <input
          className={clsx(
            "input min-w-0 flex-1",
            combatant.isPC && "font-medium text-sky-300",
            combatant.defeated && "line-through",
          )}
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => localName !== combatant.name && onChange({ name: localName })}
        />
        {combatant.isPC && <StatusBadge tone="info">PC</StatusBadge>}
        {combatant.conditions.length > 0 && (
          <StatusBadge tone="warn" title={combatant.conditions.join(", ")}>
            {combatant.conditions.length} cond
          </StatusBadge>
        )}
        <button
          className={clsx(
            "btn-ghost h-6 px-1.5 text-xs",
            combatant.defeated ? "text-emerald-400" : "text-ink-400 hover:text-red-400",
          )}
          onClick={() => onChange({ defeated: !combatant.defeated })}
          title={combatant.defeated ? "Revive" : "Mark defeated"}
          aria-label={combatant.defeated ? "Revive combatant" : "Mark combatant defeated"}
        >
          {combatant.defeated ? "Revive" : "💀"}
        </button>
        {sheet && (
          <button
            className="btn-ghost h-6 shrink-0 px-1.5 text-xs"
            onClick={() => setSheetOpen(true)}
            title="Open character sheet"
          >
            Sheet
          </button>
        )}
        <button
          className="btn-ghost h-6 w-6 shrink-0 p-0 text-ink-400 hover:text-ink-200"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "Collapse" : "Expand"}
          aria-label={expanded ? "Collapse combatant" : "Expand combatant"}
          aria-expanded={expanded}
        >
          <span className={clsx("inline-block transition-transform", expanded && "rotate-90")}>
            ▸
          </span>
        </button>
        <InlineConfirm onConfirm={onRemove} title="Remove combatant" />
      </div>

      {/* Compact HP bar with inline numbers — always visible when there's max HP */}
      {(combatant.hpMax ?? 0) > 0 && (
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1">
            <HpBar hp={combatant.hp} hpMax={combatant.hpMax} />
          </div>
          <span className="shrink-0 font-mono text-[10px] text-ink-400">
            {combatant.hp ?? 0}/{combatant.hpMax ?? 0}
          </span>
        </div>
      )}

      {/* Expanded body — full editing controls */}
      {expanded && (
        <div className="mt-2 space-y-1.5 border-t border-ink-800 pt-2">
          {/* HP / damage / AC row */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              className="btn-ghost h-6 w-6 p-0 text-base leading-none"
              onClick={() => stepHp(-1)}
              title="−1 HP"
              aria-label="Decrease HP by 1"
            >
              −
            </button>
            <input
              type="number"
              className="input w-14 text-center font-mono text-xs"
              value={localHp}
              onChange={(e) => setLocalHp(Number(e.target.value))}
              onBlur={() => localHp !== (combatant.hp ?? 0) && onChange({ hp: localHp })}
              title="HP"
            />
            <span className="text-ink-500">/</span>
            <input
              type="number"
              className="input w-14 text-center font-mono text-xs text-ink-400"
              value={localHpMax}
              onChange={(e) => setLocalHpMax(Number(e.target.value))}
              onBlur={() => localHpMax !== (combatant.hpMax ?? 0) && onChange({ hpMax: localHpMax })}
              title="Max HP"
            />
            <button
              className="btn-ghost h-6 w-6 p-0 text-base leading-none"
              onClick={() => stepHp(1)}
              title="+1 HP"
              aria-label="Increase HP by 1"
            >
              +
            </button>
            <span className="ml-1 text-xs text-ink-500">dmg</span>
            <input
              type="number"
              className="input w-14 text-center font-mono text-xs"
              placeholder="0"
              value={dmgInput}
              onChange={(e) => setDmgInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyDamage(1);
              }}
              title="Enter amount, Enter or Dmg to apply, Heal to restore"
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
            <span className="ml-auto text-xs text-ink-500">AC</span>
            <input
              type="number"
              className="input w-12 text-center font-mono text-xs"
              value={localAc}
              onChange={(e) => setLocalAc(Number(e.target.value))}
              onBlur={() => localAc !== (combatant.ac ?? 0) && onChange({ ac: localAc })}
              title="Armor Class"
            />
          </div>

          {/* Conditions */}
          <ConditionEditor conditions={combatant.conditions} onChange={setConditions} />

          {/* GM notes */}
          <input
            className="input text-xs text-ink-400"
            placeholder="GM notes (hidden from players)…"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() =>
              localNotes !== (combatant.notes ?? "") && onChange({ notes: localNotes || undefined })
            }
          />
        </div>
      )}

      {sheet && sheetOpen && (
        <CreatureSheetModal
          open
          readOnly
          onClose={() => setSheetOpen(false)}
          title={sheet.title}
          subtitle={sheet.subtitle}
          cr={sheet.cr}
          campaignId={campaignId}
          rollerName={sheet.title}
          stats={sheet.stats}
        />
      )}
    </li>
  );
}

/**
 * Condition editor: applied conditions render as removable chips, and a
 * "＋ Condition" button opens a menu of the standard 5e conditions not yet
 * applied, plus a free-text field for custom conditions.
 */
function ConditionEditor({
  conditions,
  onChange,
}: {
  conditions: string[];
  onChange: (conditions: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const has = (name: string) => conditions.some((c) => c.toLowerCase() === name.toLowerCase());
  const add = (name: string) => {
    const n = name.trim();
    if (!n || has(n)) return;
    onChange([...conditions, n]);
  };
  const remove = (name: string) => onChange(conditions.filter((c) => c !== name));

  const available = CONDITIONS.filter((c) => !has(c));

  return (
    <div className="flex flex-wrap items-center gap-1">
      {conditions.map((c) => (
        <span
          key={c}
          className="inline-flex items-center gap-1 rounded-full border border-amber-700/40 bg-amber-900/40 px-2 py-0.5 text-[11px] text-amber-200"
        >
          {c}
          <button
            className="text-amber-400/70 hover:text-amber-200"
            onClick={() => remove(c)}
            title={`Remove ${c}`}
          >
            ×
          </button>
        </span>
      ))}
      <div ref={wrapRef} className="relative">
        <button
          className="btn-ghost h-6 rounded-full border border-dashed border-ink-600 px-2 text-[11px] text-ink-400 hover:text-ink-100"
          onClick={() => setOpen((v) => !v)}
          title="Add condition"
        >
          ＋ Condition
        </button>
        {open && (
          <div className="absolute bottom-full left-0 z-20 mb-1 w-44 rounded-md border border-ink-700 bg-ink-850 p-1 shadow-lg">
            <div className="max-h-40 overflow-auto">
              {available.length === 0 ? (
                <div className="px-2 py-1 text-[11px] text-ink-400">All standard conditions applied</div>
              ) : (
                available.map((c) => (
                  <button
                    key={c}
                    className="block w-full rounded px-2 py-1 text-left text-xs text-ink-200 hover:bg-ink-800"
                    onClick={() => add(c)}
                  >
                    {c}
                  </button>
                ))
              )}
            </div>
            <div className="mt-1 border-t border-ink-700 pt-1">
              <input
                className="input text-xs"
                placeholder="Custom…"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    add(custom);
                    setCustom("");
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
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
