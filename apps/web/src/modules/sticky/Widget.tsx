import clsx from "clsx";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";

const COLORS = ["#fde68a", "#fca5a5", "#a7f3d0", "#bfdbfe", "#ddd6fe", "#fed7aa"] as const;
const DEFAULT_COLOR = COLORS[0];

/**
 * A sticky note is a plain canvas widget: its text and color live in the widget
 * `state` (persisted with the layout), and position/size come from the standard
 * widget frame. No separate model or API.
 */
function StickyWidget({ state, setState }: WidgetContext) {
  const text = typeof state?.text === "string" ? state.text : "";
  const color = typeof state?.color === "string" ? state.color : DEFAULT_COLOR;

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: color }}>
      <div className="flex items-center gap-1 border-b border-black/10 px-2 py-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setState({ color: c })}
            className={clsx(
              "h-3.5 w-3.5 rounded-full border border-black/30 transition-transform hover:scale-110",
              color === c && "ring-1 ring-black",
            )}
            style={{ backgroundColor: c }}
            title="Change color"
          />
        ))}
      </div>
      <textarea
        className="flex-1 resize-none bg-transparent p-2 text-sm text-black outline-none placeholder:text-black/40"
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
  Component: StickyWidget,
});

export {};
