import clsx from "clsx";
import { useBroadcasts, useSetBroadcast } from "./api.js";

interface Props {
  campaignId: string;
  widgetKey: string;
}

export function BroadcastToggle({ campaignId, widgetKey }: Props) {
  const list = useBroadcasts(campaignId);
  const set = useSetBroadcast(campaignId);
  const current = list.data?.find((b) => b.widgetKey === widgetKey);
  const active = current?.active ?? false;

  return (
    <button
      type="button"
      title={active ? "Stop broadcasting to player view" : "Broadcast to player view"}
      onClick={() =>
        set.mutate({ widgetKey, active: !active })
      }
      className={clsx(
        "btn h-7 px-2 text-xs",
        active
          ? "bg-accent-600 text-white hover:bg-accent-500"
          : "bg-ink-700 text-ink-200 hover:bg-ink-600",
      )}
    >
      {active ? "Live" : "Off"}
    </button>
  );
}
