import { useEffect, useState } from "react";
import clsx from "clsx";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useBroadcasts, useSetBroadcast } from "../broadcast/api.js";

const COLORS = [
  "#fde68a", // amber
  "#fca5a5", // red
  "#a7f3d0", // emerald
  "#bfdbfe", // blue
  "#ddd6fe", // violet
  "#fed7aa", // orange
  "#f9a8d4", // pink
  "#e2e8f0", // slate
] as const;
const DEFAULT_COLOR = COLORS[0];

const FONT_SIZES = ["sm", "md", "lg"] as const;
type FontSize = (typeof FONT_SIZES)[number];
const FONT_CLASS: Record<FontSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/**
 * A sticky note is a plain canvas widget: its text, color, optional title and
 * font size live in the widget `state` (persisted with the layout), and
 * position/size come from the standard widget frame. No separate model or API.
 */
function StickyWidget({ campaignId, state, setState, broadcastKey }: WidgetContext) {
  const text = typeof state?.text === "string" ? state.text : "";
  const title = typeof state?.title === "string" ? state.title : "";
  const color = typeof state?.color === "string" ? state.color : DEFAULT_COLOR;
  const fontSize: FontSize = FONT_SIZES.includes(state?.fontSize as FontSize)
    ? (state!.fontSize as FontSize)
    : "md";
  const [showTitle, setShowTitle] = useState(Boolean(title));

  // Sticky notes share their own canvas state (share: "state"): while the GM has
  // this note broadcasting, push edits into the broadcast payload so the player
  // view stays in sync. Debounced so typing doesn't hammer the API.
  const broadcasts = useBroadcasts(campaignId);
  const setBroadcast = useSetBroadcast(campaignId);
  const isBroadcasting = Boolean(
    broadcastKey && broadcasts.data?.find((b) => b.widgetKey === broadcastKey)?.active,
  );
  useEffect(() => {
    if (!isBroadcasting || !broadcastKey) return;
    const id = setTimeout(() => {
      setBroadcast.mutate({
        widgetKey: broadcastKey,
        active: true,
        payload: { text, title: title || null, color, fontSize },
      });
    }, 400);
    return () => clearTimeout(id);
    // setBroadcast is stable from a queryClient closure; intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBroadcasting, broadcastKey, text, title, color, fontSize]);

  const cycleFont = () => {
    const idx = FONT_SIZES.indexOf(fontSize);
    setState({ fontSize: FONT_SIZES[(idx + 1) % FONT_SIZES.length] });
  };

  return (
    <div
      className="group/sticky flex h-full flex-col shadow-inner"
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center gap-1 border-b border-black/10 px-2 py-1 opacity-40 transition-opacity group-hover/sticky:opacity-100 focus-within:opacity-100">
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setState({ color: c })}
              className={clsx(
                "h-3.5 w-3.5 rounded-full border border-black/30 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-black",
                color === c && "ring-1 ring-black",
              )}
              style={{ backgroundColor: c }}
              title="Change color"
              aria-label="Change note color"
              aria-pressed={color === c}
            />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowTitle((v) => !v)}
            className="rounded px-1 text-xs font-semibold text-black/60 hover:bg-black/10 hover:text-black"
            title="Toggle title"
            aria-label="Toggle title field"
            aria-pressed={showTitle}
          >
            T
          </button>
          <button
            type="button"
            onClick={cycleFont}
            className="rounded px-1 text-xs text-black/60 hover:bg-black/10 hover:text-black"
            title="Text size"
            aria-label="Cycle text size"
          >
            {fontSize === "sm" ? "A−" : fontSize === "lg" ? "A+" : "A"}
          </button>
        </div>
      </div>
      {showTitle && (
        <input
          className="border-b border-black/10 bg-transparent px-2 py-1 text-sm font-bold text-black outline-none placeholder:text-black/40"
          value={title}
          onChange={(e) => setState({ title: e.target.value })}
          placeholder="Title…"
        />
      )}
      <textarea
        className={clsx(
          "flex-1 resize-none bg-transparent p-2 text-black outline-none placeholder:text-black/40",
          FONT_CLASS[fontSize],
        )}
        value={text}
        onChange={(e) => setState({ text: e.target.value })}
        placeholder="Note…"
      />
    </div>
  );
}

registerWidget({
  type: "sticky",
  title: "Sticky Note",
  defaultSize: { w: 240, h: 200 },
  icon: "📝",
  share: "state",
  Component: StickyWidget,
});

export {};
