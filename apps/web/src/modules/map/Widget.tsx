import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { Location, MapPin, MapReveal } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { useBroadcasts, useSetBroadcast } from "../broadcast/api.js";
import {
  useCreateLocation,
  useDeleteLocation,
  useLocations,
  useUpdateLocation,
  useUploadAsset,
} from "./api.js";

type Tool = "pin" | "reveal" | null;

const pinId = () => `pin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
const revealId = () => `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function MapWidget({ campaignId, state, setState }: WidgetContext) {
  const list = useLocations(campaignId);
  const create = useCreateLocation(campaignId);
  const update = useUpdateLocation(campaignId);
  const remove = useDeleteLocation(campaignId);
  const upload = useUploadAsset();
  const broadcasts = useBroadcasts(campaignId);
  const setBroadcast = useSetBroadcast(campaignId);

  const selectedId = typeof state?.selectedId === "string" ? state.selectedId : null;
  const selected = list.data?.find((l) => l.id === selectedId) ?? null;

  // First location loads as the default selection.
  useEffect(() => {
    if (!selectedId && list.data && list.data.length > 0) {
      setState({ selectedId: list.data[0]!.id });
    }
  }, [selectedId, list.data, setState]);

  const mapBroadcast = broadcasts.data?.find((b) => b.widgetKey === "map:current");
  const isBroadcasting = Boolean(mapBroadcast?.active);
  const broadcastLocationId =
    typeof mapBroadcast?.payload?.locationId === "string"
      ? (mapBroadcast.payload.locationId as string)
      : null;

  // Sync broadcast payload to the currently selected location whenever the GM
  // changes selection while broadcasting.
  useEffect(() => {
    if (!isBroadcasting || !selectedId) return;
    if (broadcastLocationId === selectedId) return;
    setBroadcast.mutate({
      widgetKey: "map:current",
      active: true,
      payload: { locationId: selectedId },
    });
    // setBroadcast is stable from a queryClient closure; intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBroadcasting, selectedId, broadcastLocationId]);

  const [name, setName] = useState("");
  const [tool, setTool] = useState<Tool>(null);

  const onAddLocation = () => {
    const n = name.trim();
    if (!n) return;
    create.mutate(
      { name: n },
      {
        onSuccess: (loc) => {
          setName("");
          setState({ selectedId: loc.id });
        },
      },
    );
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-44 min-w-[10rem] flex-col border-r border-ink-700 bg-ink-900">
        <div className="flex items-center gap-1 border-b border-ink-700 p-2">
          <input
            className="input"
            placeholder="New location…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddLocation()}
          />
          <button
            className="btn-primary px-2"
            onClick={onAddLocation}
            disabled={!name.trim()}
          >
            +
          </button>
        </div>
        <ul className="flex-1 overflow-auto text-sm">
          {list.data?.map((loc) => (
            <li key={loc.id}>
              <button
                onClick={() => setState({ selectedId: loc.id })}
                className={clsx(
                  "block w-full truncate px-2 py-1.5 text-left",
                  loc.id === selectedId
                    ? "bg-ink-800 text-ink-50"
                    : "text-ink-300 hover:bg-ink-800/60",
                )}
                title={loc.name}
              >
                {loc.name}
              </button>
            </li>
          ))}
          {list.data?.length === 0 && (
            <li className="px-2 py-2 text-xs text-ink-400">No locations yet.</li>
          )}
        </ul>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {selected ? (
          <MapEditor
            location={selected}
            tool={tool}
            setTool={setTool}
            onChange={(input) => update.mutate({ id: selected.id, input })}
            onUpload={(file) =>
              upload.mutate(file, {
                onSuccess: (asset) =>
                  update.mutate({ id: selected.id, input: { imageAssetId: asset.id } }),
              })
            }
            onDelete={() => {
              if (confirm(`Delete location "${selected.name}"?`)) {
                remove.mutate(selected.id);
                setState({ selectedId: null });
              }
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-400">
            Pick a location, or create one.
          </div>
        )}
      </div>
    </div>
  );
}

interface EditorProps {
  location: Location;
  tool: Tool;
  setTool: (t: Tool) => void;
  onChange: (input: Parameters<ReturnType<typeof useUpdateLocation>["mutate"]>[0]["input"]) => void;
  onUpload: (file: File) => void;
  onDelete: () => void;
}

function MapEditor({ location, tool, setTool, onChange, onUpload, onDelete }: EditorProps) {
  const imgRef = useRef<HTMLDivElement | null>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tool || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    if (tool === "pin") {
      const next: MapPin = {
        id: pinId(),
        x,
        y,
        label: "",
        color: "#fbbf24",
        playerVisible: true,
      };
      onChange({ pins: [...location.pins, next] });
    } else if (tool === "reveal") {
      // Drop a 20%-wide reveal centered on the click; the GM can edit it below.
      const next: MapReveal = {
        id: revealId(),
        x: Math.max(0, x - 0.1),
        y: Math.max(0, y - 0.1),
        w: Math.min(0.2, 1 - Math.max(0, x - 0.1)),
        h: Math.min(0.2, 1 - Math.max(0, y - 0.1)),
        mode: "reveal",
      };
      onChange({ reveals: [...location.reveals, next] });
    }
    setTool(null);
  };

  const updatePin = (id: string, patch: Partial<MapPin>) => {
    onChange({ pins: location.pins.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };
  const removePin = (id: string) => {
    onChange({ pins: location.pins.filter((p) => p.id !== id) });
  };
  const updateReveal = (id: string, patch: Partial<MapReveal>) => {
    onChange({ reveals: location.reveals.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };
  const removeReveal = (id: string) => {
    onChange({ reveals: location.reveals.filter((r) => r.id !== id) });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-ink-700 bg-ink-900/40 px-2 py-1.5">
        <input
          className="input flex-1"
          value={location.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <label className="btn-ghost cursor-pointer">
          Upload map
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          className={clsx("btn-ghost", tool === "pin" && "bg-accent-600 text-white")}
          onClick={() => setTool(tool === "pin" ? null : "pin")}
          disabled={!location.imageUrl}
          title="Click to drop a pin"
        >
          Pin
        </button>
        <button
          className={clsx("btn-ghost", tool === "reveal" && "bg-accent-600 text-white")}
          onClick={() => setTool(tool === "reveal" ? null : "reveal")}
          disabled={!location.imageUrl}
          title="Click to drop a reveal rectangle"
        >
          Reveal
        </button>
        <button className="btn-ghost text-red-300" onClick={onDelete} title="Delete location">
          ×
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map canvas */}
        <div className="relative flex-1 overflow-auto bg-ink-950">
          {location.imageUrl ? (
            <div
              ref={imgRef}
              className={clsx(
                "relative inline-block min-h-full min-w-full select-none",
                tool && "cursor-crosshair",
              )}
              onClick={handleImageClick}
            >
              <img
                src={location.imageUrl}
                alt={location.name}
                draggable={false}
                className="block max-w-none"
              />
              {/* Reveals (GM view: semi-transparent yellow outline) */}
              {location.reveals.map((r) => (
                <div
                  key={r.id}
                  className={clsx(
                    "pointer-events-none absolute border-2",
                    r.mode === "reveal"
                      ? "border-amber-400/70 bg-amber-300/10"
                      : "border-sky-400/70 bg-sky-300/10",
                  )}
                  style={{
                    left: `${r.x * 100}%`,
                    top: `${r.y * 100}%`,
                    width: `${r.w * 100}%`,
                    height: `${r.h * 100}%`,
                  }}
                />
              ))}
              {/* Pins */}
              {location.pins.map((p) => (
                <div
                  key={p.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                  title={p.label || "(unlabeled)"}
                >
                  <div
                    className={clsx(
                      "h-3.5 w-3.5 rounded-full border-2 border-ink-950 shadow",
                      !p.playerVisible && "opacity-60",
                    )}
                    style={{ backgroundColor: p.color }}
                  />
                  {p.label && (
                    <span className="absolute left-3 top-0 whitespace-nowrap rounded bg-ink-900/80 px-1.5 py-0.5 text-xs text-ink-50">
                      {p.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-sm text-ink-400">
              No image. Use “Upload map” to add one.
            </div>
          )}
        </div>

        {/* Right column: pin & reveal editor + notes */}
        <aside className="w-64 min-w-[16rem] overflow-auto border-l border-ink-700 bg-ink-900/30 p-2 text-xs">
          <section className="mb-3">
            <header className="mb-1 text-ink-300">Pins ({location.pins.length})</header>
            {location.pins.length === 0 && (
              <div className="text-ink-500">Toggle “Pin” then click the map.</div>
            )}
            {location.pins.map((p) => (
              <div key={p.id} className="mb-1.5 rounded border border-ink-700 bg-ink-900 p-1.5">
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={p.color}
                    onChange={(e) => updatePin(p.id, { color: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded border border-ink-700 bg-transparent"
                  />
                  <input
                    className="input flex-1"
                    value={p.label}
                    placeholder="Label"
                    onChange={(e) => updatePin(p.id, { label: e.target.value })}
                  />
                  <button
                    className="btn-ghost px-1.5"
                    onClick={() => removePin(p.id)}
                    title="Remove pin"
                  >
                    ×
                  </button>
                </div>
                <label className="mt-1 flex items-center gap-1.5 text-ink-300">
                  <input
                    type="checkbox"
                    checked={p.playerVisible}
                    onChange={(e) => updatePin(p.id, { playerVisible: e.target.checked })}
                  />
                  Visible to players
                </label>
              </div>
            ))}
          </section>

          <section className="mb-3">
            <header className="mb-1 text-ink-300">Reveals ({location.reveals.length})</header>
            {location.reveals.map((r) => (
              <div key={r.id} className="mb-1.5 rounded border border-ink-700 bg-ink-900 p-1.5">
                <div className="flex items-center gap-1">
                  <select
                    className="input"
                    value={r.mode}
                    onChange={(e) =>
                      updateReveal(r.id, { mode: e.target.value as MapReveal["mode"] })
                    }
                  >
                    <option value="reveal">Reveal</option>
                    <option value="hide">Hide</option>
                  </select>
                  <button
                    className="btn-ghost px-1.5"
                    onClick={() => removeReveal(r.id)}
                    title="Remove reveal"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-1 grid grid-cols-4 gap-1">
                  <NumInput label="x" value={r.x} onChange={(v) => updateReveal(r.id, { x: v })} />
                  <NumInput label="y" value={r.y} onChange={(v) => updateReveal(r.id, { y: v })} />
                  <NumInput label="w" value={r.w} onChange={(v) => updateReveal(r.id, { w: v })} />
                  <NumInput label="h" value={r.h} onChange={(v) => updateReveal(r.id, { h: v })} />
                </div>
              </div>
            ))}
          </section>

          <section>
            <header className="mb-1 text-ink-300">Player notes</header>
            <textarea
              className="input min-h-[60px]"
              value={location.playerNotes ?? ""}
              onChange={(e) => onChange({ playerNotes: e.target.value })}
            />
            <header className="mt-2 mb-1 text-ink-300">GM notes</header>
            <textarea
              className="input min-h-[60px]"
              value={location.gmNotes ?? ""}
              onChange={(e) => onChange({ gmNotes: e.target.value })}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col text-ink-400">
      <span>{label}</span>
      <input
        type="number"
        step="0.01"
        min={0}
        max={1}
        className="input"
        value={value.toFixed(2)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(0, Math.min(1, n)));
        }}
      />
    </label>
  );
}

registerWidget({
  type: "map",
  title: "Map Display",
  defaultSize: { w: 640, h: 480 },
  broadcastKey: "map:current",
  Component: MapWidget,
});

export {};
