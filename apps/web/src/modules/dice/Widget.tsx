import { useEffect, useState } from "react";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";

type Roll = {
  id: string;
  notation: string;
  result: number;
  breakdownJson: string;
  label?: string | null;
  createdAt: string;
};

function DiceWidget({ campaignId }: WidgetContext) {
  const [notation, setNotation] = useState("1d20");
  const [label, setLabel] = useState("");
  const [history, setHistory] = useState<Roll[] | null>(null);
  const [pending, setPending] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/dice`);
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const doRoll = async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/dice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notation, label: label || undefined }),
      });
      if (res.ok) {
        setNotation(notation);
        setLabel("");
        await load();
      } else {
        const err = await res.json().catch(() => null);
        console.error("Roll failed", err);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-ink-700 p-2">
        <input className="input w-32" value={notation} onChange={(e) => setNotation(e.target.value)} />
        <input className="input flex-1" placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="btn-primary px-2" onClick={doRoll} disabled={pending}>
          Roll
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 text-sm">
        {history && history.length > 0 ? (
          <ul className="space-y-1">
            {history.map((r) => (
              <li key={r.id} className="rounded-md border border-ink-700 bg-ink-900 p-2">
                <div className="flex items-baseline gap-2">
                  <div className="font-medium">{r.notation}</div>
                  <div className="text-ink-400">→</div>
                  <div className="text-accent-200">{r.result}</div>
                  {r.label && <div className="ml-auto text-xs text-ink-400">{r.label}</div>}
                </div>
                <pre className="mt-1 text-xs font-mono text-ink-400">{r.breakdownJson}</pre>
                <div className="mt-1 text-xs text-ink-400">{new Date(r.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-ink-400">No rolls yet.</div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: "dice",
  title: "Dice Roller",
  defaultSize: { w: 300, h: 360 },
  Component: DiceWidget,
});

export {};
