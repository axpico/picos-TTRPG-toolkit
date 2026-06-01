import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Modal } from "../components/Modal.js";
import { listWidgets } from "./WidgetRegistry.js";
import { filterWidgets } from "./widget-filter.js";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (type: string) => void;
}

export function WidgetPalette({ open, onClose, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo(() => listWidgets(), []);
  const results = useMemo(() => filterWidgets(all, query), [all, query]);

  // Reset state each time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Focus after the modal mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const choose = (index: number) => {
    const def = results[index];
    if (def) {
      onAdd(def.type);
      onClose();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    }
  };

  return (
    <Modal open={open} onClose={onClose} align="top" className="max-w-md" labelledBy="palette-title">
      <div className="border-b border-ink-700 p-3">
        <h2 id="palette-title" className="sr-only">Add a widget</h2>
        <input
          ref={inputRef}
          className="input"
          placeholder="Search widgets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      <ul className="max-h-80 overflow-auto p-2">
        {results.map((def, i) => (
          <li key={def.type}>
            <button
              onMouseMove={() => setActive(i)}
              onClick={() => choose(i)}
              className={clsx(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                i === active ? "bg-accent-500/15 text-ink-50" : "text-ink-200 hover:bg-ink-800",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-700 bg-ink-900 text-xs">
                {def.icon ?? def.title.charAt(0)}
              </span>
              <span className="font-medium">{def.title}</span>
              {def.broadcastKey !== undefined && (
                <span className="ml-auto chip">broadcastable</span>
              )}
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-ink-500">No widgets match “{query}”.</li>
        )}
      </ul>
      <div className="border-t border-ink-700 px-3 py-2 text-xs text-ink-500">
        ↑↓ to navigate · Enter to add · Esc to close
      </div>
    </Modal>
  );
}
