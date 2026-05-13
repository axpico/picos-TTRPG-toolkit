import { useMemo, useState } from "react";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useLog } from "./api.js";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function SessionLogWidget({ campaignId }: WidgetContext) {
  const log = useLog(campaignId);
  const [kindFilter, setKindFilter] = useState("");

  const kinds = useMemo(() => {
    const set = new Set(log.data?.map((e) => e.kind) ?? []);
    return Array.from(set).sort();
  }, [log.data]);

  const entries = kindFilter
    ? log.data?.filter((e) => e.kind === kindFilter)
    : log.data;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-1.5 text-xs text-ink-400">
        <span>{entries?.length ?? 0} entries</span>
        {kinds.length > 0 && (
          <select
            className="input ml-1 h-6 py-0 text-xs"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
          >
            <option value="">All kinds</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        )}
        <a
          className="ml-auto text-accent-500 hover:text-accent-700"
          href={`/api/campaigns/${campaignId}/log/export`}
          download
        >
          Export markdown
        </a>
      </div>
      <ul className="flex-1 overflow-auto px-2 py-2 text-sm">
        {entries?.map((entry) => (
          <li key={entry.id} className="flex gap-2 py-0.5">
            <span className="font-mono text-xs text-ink-500 shrink-0">{fmtTime(entry.createdAt)}</span>
            <span className="chip shrink-0">{entry.kind}</span>
            <span className="text-ink-200">{entry.message}</span>
          </li>
        ))}
        {entries?.length === 0 && (
          <li className="text-ink-400">
            {kindFilter ? "No entries of this kind." : "Empty log — actions will appear here."}
          </li>
        )}
      </ul>
    </div>
  );
}

registerWidget({
  type: "log",
  title: "Session Log",
  defaultSize: { w: 460, h: 320 },
  Component: SessionLogWidget,
});

export {};
