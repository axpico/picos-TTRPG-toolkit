import { useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import clsx from "clsx";
import { STICKY_COLORS, type StickyNote } from "@toolkit/shared";
import {
  useDeleteStickyNote,
  useStickyNotes,
  useUpdateStickyNote,
} from "./api.js";

interface Props {
  campaignId: string;
}

/**
 * Renders sticky notes on the canvas plane alongside widgets. Notes own their
 * own position/size in the StickyNote table — they're not part of the Layout
 * blob. Drag/resize writes back to the server on stop; text edits debounce.
 */
export function StickyLayer({ campaignId }: Props) {
  const notes = useStickyNotes(campaignId);
  const update = useUpdateStickyNote(campaignId);
  const remove = useDeleteStickyNote(campaignId);

  if (!notes.data) return null;
  return (
    <>
      {notes.data.map((n) => (
        <StickyView
          key={n.id}
          note={n}
          onPatch={(patch) => update.mutate({ id: n.id, input: patch })}
          onDelete={() => remove.mutate(n.id)}
        />
      ))}
    </>
  );
}

interface StickyViewProps {
  note: StickyNote;
  onPatch: (patch: Partial<StickyNote>) => void;
  onDelete: () => void;
}

function StickyView({ note, onPatch, onDelete }: StickyViewProps) {
  const [text, setText] = useState(note.text);

  // Reconcile incoming changes from another tab / refetch.
  useEffect(() => {
    setText(note.text);
  }, [note.text]);

  // Debounced text writeback.
  useEffect(() => {
    if (text === note.text) return;
    const t = setTimeout(() => onPatch({ text }), 400);
    return () => clearTimeout(t);
  }, [text, note.text, onPatch]);

  return (
    <Rnd
      className="no-pan"
      bounds="parent"
      position={{ x: note.x, y: note.y }}
      size={{ width: note.width, height: note.height }}
      minWidth={140}
      minHeight={100}
      onDragStop={(_e, d) => onPatch({ x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        onPatch({
          width: parseFloat(ref.style.width),
          height: parseFloat(ref.style.height),
          x: pos.x,
          y: pos.y,
        })
      }
      style={{ backgroundColor: note.color }}
    >
      <div className="flex h-full flex-col rounded-sm border border-black/10 shadow-md">
        <div className="flex items-center justify-between px-1 py-0.5 text-[10px] text-black/60">
          <div className="flex items-center gap-0.5">
            {STICKY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onPatch({ color: c })}
                className={clsx(
                  "h-3 w-3 rounded-full border border-black/30",
                  note.color === c && "ring-1 ring-black",
                )}
                style={{ backgroundColor: c }}
                title="Change color"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this note?")) onDelete();
            }}
            className="px-1 text-black/60 hover:text-black"
            title="Delete note"
          >
            ×
          </button>
        </div>
        <textarea
          className="flex-1 resize-none bg-transparent p-2 text-sm text-black outline-none placeholder:text-black/40"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Note…"
        />
      </div>
    </Rnd>
  );
}
