import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { Timer, UpdateTimerInput } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { EmptyState } from "../../components/EmptyState.js";
import { InlineConfirm } from "../shared.js";
import { useCreateTimer, useDeleteTimer, useTimers, useUpdateTimer } from "./api.js";
import { formatDuration, isRunning, playAlarm, remainingSeconds } from "./util.js";

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ec4899"] as const;
const PRESETS = [1, 5, 10] as const; // minutes

function TimersWidget({ campaignId }: WidgetContext) {
  const list = useTimers(campaignId);
  const create = useCreateTimer(campaignId);
  const update = useUpdateTimer(campaignId);
  const remove = useDeleteTimer(campaignId);

  const [newName, setNewName] = useState("");
  const [newMinutes, setNewMinutes] = useState(5);

  // One ticking clock drives every card; remaining is computed from endsAt.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const timers = list.data ?? [];

  // Fire the alarm once when a running timer crosses to zero.
  const alarmed = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const timer of timers) {
      const atZero = isRunning(timer) && remainingSeconds(timer, nowMs) === 0;
      if (atZero && !alarmed.current.has(timer.id)) {
        alarmed.current.add(timer.id);
        playAlarm();
      } else if (!atZero) {
        alarmed.current.delete(timer.id);
      }
    }
  }, [timers, nowMs]);

  const doCreate = () => {
    const name = newName.trim();
    if (!name) return;
    create.mutate(
      { name, durationSeconds: Math.max(1, Math.round(newMinutes * 60)) },
      { onSuccess: () => setNewName("") },
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-ink-700 px-2 py-1.5">
        <input
          className="input flex-1"
          placeholder="New timer name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doCreate()}
        />
        <div className="flex gap-0.5">
          {PRESETS.map((m) => (
            <button
              key={m}
              className={clsx(
                "h-7 w-9 rounded font-mono text-xs",
                newMinutes === m ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => setNewMinutes(m)}
              title={`${m} min`}
            >
              {m}m
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          className="input w-14 text-right"
          value={newMinutes}
          onChange={(e) => setNewMinutes(Math.max(1, Number(e.target.value) || 1))}
          title="Minutes"
        />
        <button className="btn-primary px-2" disabled={!newName.trim() || create.isPending} onClick={doCreate} aria-label="Add timer">
          +
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {timers.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {timers.map((timer) => (
              <TimerCard
                key={timer.id}
                timer={timer}
                nowMs={nowMs}
                onChange={(input) => update.mutate({ id: timer.id, input })}
                onDelete={() => remove.mutate(timer.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-4">
            <EmptyState
              icon="⏱️"
              title="No timers yet"
              description="Add a countdown for combat turns, rests, or a dramatic 'decide now' clock players can see."
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface TimerCardProps {
  timer: Timer;
  nowMs: number;
  onChange: (input: UpdateTimerInput) => void;
  onDelete: () => void;
}

function TimerCard({ timer, nowMs, onChange, onDelete }: TimerCardProps) {
  const [localName, setLocalName] = useState(timer.name);
  useEffect(() => setLocalName(timer.name), [timer.name]);

  const running = isRunning(timer);
  const remaining = remainingSeconds(timer, nowMs);
  const done = remaining === 0;
  const pct = timer.durationSeconds > 0 ? (remaining / timer.durationSeconds) * 100 : 0;
  const urgent = running && !done && remaining <= 10;
  const warn = running && !done && remaining <= 30 && remaining > 10;

  const start = () => {
    const base = remaining > 0 ? remaining : timer.durationSeconds;
    onChange({ endsAt: new Date(Date.now() + base * 1000).toISOString(), remainingSeconds: base });
  };
  const pause = () => onChange({ endsAt: null, remainingSeconds: remaining });
  const reset = () => onChange({ endsAt: null, remainingSeconds: timer.durationSeconds });

  return (
    <div
      className={clsx(
        "flex flex-col gap-1.5 rounded-md border p-2 text-sm transition-colors",
        running && done
          ? "animate-pulse border-red-500/70 bg-red-900/20"
          : urgent
            ? "animate-pulse border-red-500/50 bg-red-900/10"
            : warn
              ? "border-amber-500/50 bg-amber-900/10"
              : timer.secret
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-ink-700 bg-ink-900",
      )}
    >
      <div className="flex items-center gap-1">
        <input
          className="input flex-1 text-sm font-medium"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => localName !== timer.name && onChange({ name: localName })}
        />
        <button
          className={clsx(
            "btn-ghost h-6 px-1 text-xs",
            timer.secret ? "text-amber-400" : "text-ink-400 hover:text-ink-200",
          )}
          onClick={() => onChange({ secret: !timer.secret })}
          title={timer.secret ? "Secret — hidden from players" : "Visible to players when broadcast"}
          aria-label={timer.secret ? "Make timer visible to players" : "Hide timer from players"}
          aria-pressed={timer.secret}
        >
          {timer.secret ? "🔒" : "🔓"}
        </button>
        <InlineConfirm onConfirm={onDelete} title="Delete timer" />
      </div>

      <div className="py-1 text-center">
        <span
          className={clsx(
            "font-mono text-3xl font-bold tabular-nums",
            done ? "text-red-400" : urgent ? "text-red-300" : warn ? "text-amber-300" : "text-ink-100",
          )}
        >
          {formatDuration(remaining)}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: timer.color }}
        />
      </div>

      <div className="flex gap-1">
        {running ? (
          <button className="btn-ghost h-6 flex-1 text-xs" onClick={pause}>
            ⏸ Pause
          </button>
        ) : (
          <button className="btn-primary h-6 flex-1 text-xs" onClick={start}>
            ▶ {remaining > 0 && remaining < timer.durationSeconds ? "Resume" : "Start"}
          </button>
        )}
        <button
          className="btn-ghost h-6 px-2 text-xs text-ink-400"
          onClick={reset}
          disabled={!running && remaining === timer.durationSeconds}
          title="Reset"
          aria-label="Reset timer"
        >
          ↺
        </button>
      </div>

      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            className={clsx(
              "h-3.5 w-3.5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
              timer.color === c ? "scale-110 border-ink-100" : "border-transparent",
            )}
            style={{ backgroundColor: c }}
            onClick={() => onChange({ color: c })}
            aria-label="Set timer color"
            aria-pressed={timer.color === c}
          />
        ))}
      </div>
    </div>
  );
}

registerWidget({
  type: "timers",
  title: "Timers",
  defaultSize: { w: 360, h: 420 },
  icon: "⏱️",
  broadcastKey: "timers",
  Component: TimersWidget,
});

export {};
