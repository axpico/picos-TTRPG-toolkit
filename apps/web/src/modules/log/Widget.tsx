import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useLog } from "./api.js";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString();
}

function SessionLogWidget({ campaignId }: WidgetContext) {
  const log = useLog(campaignId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700 px-3 py-1.5 text-xs text-ink-400">
        <span>{log.data?.length ?? 0} entries</span>
        <a
          className="text-accent-500 hover:text-accent-700"
          href={`/api/campaigns/${campaignId}/log/export`}
          download
        >
          Export markdown
        </a>
      </div>
      <ul className="flex-1 overflow-auto px-2 py-2 text-sm">
        {log.data?.map((entry) => (
          <li key={entry.id} className="flex gap-2 py-0.5">
            <span className="font-mono text-xs text-ink-500">{fmtTime(entry.createdAt)}</span>
            <span className="chip">{entry.kind}</span>
            <span className="text-ink-200">{entry.message}</span>
          </li>
        ))}
        {log.data?.length === 0 && (
          <li className="text-ink-400">Empty log — actions will appear here.</li>
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
