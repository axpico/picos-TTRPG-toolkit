import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  emptyStatBlock,
  isPointRevealed,
  presetTokenSize,
  snapToGrid,
  type Location,
  type MapGrid,
  type MapPin,
  type MapReveal,
  type MapToken,
  type MapTokenDto,
  type StatBlock,
  type TokenSizePreset,
} from "@toolkit/shared";
import { CreatureSheetModal } from "../../components/statblock/CreatureSheetModal.js";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { InlineConfirm } from "../shared.js";
import { useBroadcasts, useSetBroadcast } from "../broadcast/api.js";
import { useParty } from "../party/api.js";
import { useMonsters } from "../bestiary/api.js";
import {
  clamp01,
  drawReveal,
  isDrag,
  moveReveal,
  resizeReveal,
  toNormalized,
  type Point,
  type ResizeHandle,
} from "./geometry.js";
import { detectGrid } from "./grid-detect.js";
import { GridOverlay } from "./TokenView.js";
import {
  useCreateLocation,
  useDeleteLocation,
  useLocations,
  useUpdateLocation,
  useUploadAsset,
} from "./api.js";

type Tool = "pin" | "reveal" | "token" | null;

const pinId = () => `pin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
const revealId = () => `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
const tokenId = () => `tok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const DEFAULT_TOKEN_COLOR = "#f87171";
const DEFAULT_GRID: MapGrid = {
  enabled: true,
  visible: true,
  size: 0.05,
  offsetX: 0,
  offsetY: 0,
  color: "#38bdf8",
};

/** Strip the derived imageUrl so we send the stored `MapToken` shape on PATCH. */
const toStoredToken = (t: MapTokenDto): MapToken => {
  const { imageUrl: _omit, ...rest } = t;
  return rest;
};

function MapWidget({ campaignId, state, setState }: WidgetContext) {
  const list = useLocations(campaignId);
  const create = useCreateLocation(campaignId);
  const update = useUpdateLocation(campaignId);
  const remove = useDeleteLocation(campaignId);
  const upload = useUploadAsset(campaignId);
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
            key={selected.id}
            campaignId={campaignId}
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
            uploadAsset={upload}
            onDelete={() => {
              remove.mutate(selected.id);
              setState({ selectedId: null });
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
  campaignId: string;
  location: Location;
  tool: Tool;
  setTool: (t: Tool) => void;
  onChange: (input: Parameters<ReturnType<typeof useUpdateLocation>["mutate"]>[0]["input"]) => void;
  onUpload: (file: File) => void;
  uploadAsset: ReturnType<typeof useUploadAsset>;
  onDelete: () => void;
}

/** A live working copy held during a drag so we PATCH once per gesture. */
interface WorkState {
  pins: MapPin[];
  reveals: MapReveal[];
  tokens: MapTokenDto[];
}

/** The in-flight pointer gesture, tracked via a ref so window listeners see it. */
type Interaction =
  | { kind: "pan"; startClient: { x: number; y: number }; startScroll: { left: number; top: number } }
  | { kind: "draw"; start: Point; current: Point }
  | { kind: "movePin"; id: string; startClient: { x: number; y: number }; moved: boolean }
  | { kind: "moveReveal"; id: string; lastNorm: Point }
  | { kind: "resizeReveal"; id: string; handle: ResizeHandle; lastNorm: Point }
  | { kind: "moveToken"; id: string; startClient: { x: number; y: number }; moved: boolean }
  | { kind: "resizeToken"; id: string };

const NEW_PIN_COLOR = "#fbbf24";
const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

type PanelTab = "tokens" | "reveals" | "pins" | "grid" | "notes";

/** Tool buttons shown in the editor toolbar. */
const TOOLS: { tool: Exclude<Tool, null>; icon: string; label: string; title: string }[] = [
  { tool: "token", icon: "⬤", label: "Token", title: "Click the map to drop a token" },
  { tool: "reveal", icon: "▦", label: "Reveal", title: "Drag on the map to draw a fog reveal" },
  { tool: "pin", icon: "📍", label: "Pin", title: "Click the map to drop a pin" },
];
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

const centerX = (ref: React.RefObject<HTMLElement | null>) => {
  const r = ref.current?.getBoundingClientRect();
  return r ? r.left + r.width / 2 : 0;
};
const centerY = (ref: React.RefObject<HTMLElement | null>) => {
  const r = ref.current?.getBoundingClientRect();
  return r ? r.top + r.height / 2 : 0;
};

function MapEditor({ campaignId, location, tool, setTool, onChange, onUpload, uploadAsset, onDelete }: EditorProps) {
  // viewport = the scrolling clip area; content = the scaled image+overlay box.
  // getBoundingClientRect on `content` reflects the current scale and scroll, so
  // normalized coords stay correct without any transform math.
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);

  // Latest values read by the window pointer listeners (which are bound once).
  const locationRef = useRef(location);
  locationRef.current = location;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const toolRef = useRef(tool);
  toolRef.current = tool;

  const interactionRef = useRef<Interaction | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const workRef = useRef(work);
  workRef.current = work;
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  // Self-contained pan/zoom: native scroll for pan, explicit scale for zoom.
  // (The whole board already lives inside the canvas's own pan/zoom surface, so
  // nesting a second pan/zoom library here would double-zoom and fight it.)
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const naturalRef = useRef<{ w: number; h: number } | null>(null);
  const pendingAnchor = useRef<{ relX: number; relY: number; clientX: number; clientY: number } | null>(null);
  const centerPending = useRef(false);

  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>("tokens");
  // Grid calibration: click two adjacent intersections to derive cell size/offset.
  const [calibrating, setCalibrating] = useState(false);
  const calibPoint = useRef<Point | null>(null);

  // Activating a tool focuses the matching panel tab so its editor is in view.
  const selectTool = (next: Tool) => {
    setTool(next);
    if (next === "pin") setPanelTab("pins");
    else if (next === "reveal") setPanelTab("reveals");
    else if (next === "token") setPanelTab("tokens");
  };

  // During a gesture, render from the working copy for instant feedback.
  const pins = work?.pins ?? location.pins;
  const reveals = work?.reveals ?? location.reveals;
  const tokens = work?.tokens ?? location.tokens;
  const grid = location.grid;

  // Image aspect (width/height) — keeps grid cells square and snapping correct.
  const gridAspect = () => {
    const n = naturalRef.current;
    return n && n.h > 0 ? n.w / n.h : 1;
  };
  const aspect = natural && natural.h > 0 ? natural.w / natural.h : 1;

  const normFromEvent = (clientX: number, clientY: number): Point | null => {
    const el = contentRef.current;
    if (!el) return null;
    return toNormalized(clientX, clientY, el.getBoundingClientRect());
  };

  const seedReveals = () => workRef.current?.reveals ?? locationRef.current.reveals;
  const seedPins = () => workRef.current?.pins ?? locationRef.current.pins;
  const seedTokens = () => workRef.current?.tokens ?? locationRef.current.tokens;
  const seedBase = (): WorkState => ({ pins: seedPins(), reveals: seedReveals(), tokens: seedTokens() });

  // Zoom toward a screen point, keeping that point fixed under the cursor.
  const zoomAtClient = useCallback((factor: number, clientX: number, clientY: number) => {
    const content = contentRef.current;
    if (!content) return;
    const rect = content.getBoundingClientRect();
    const cur = scaleRef.current;
    pendingAnchor.current = {
      relX: (clientX - rect.left) / cur,
      relY: (clientY - rect.top) / cur,
      clientX,
      clientY,
    };
    setScale((s) => clampScale(s * factor));
  }, []);

  const fitToViewport = useCallback(() => {
    const vp = viewportRef.current;
    const nat = naturalRef.current;
    if (!vp || !nat) return;
    const fit = Math.min(vp.clientWidth / nat.w, vp.clientHeight / nat.h);
    pendingAnchor.current = null;
    centerPending.current = true;
    setScale(clampScale(fit > 0 ? fit : 1));
  }, []);

  // Apply the scroll adjustment that keeps the zoom anchor (or center) fixed,
  // after the new scale has been laid out.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp) return;
    if (pendingAnchor.current) {
      const a = pendingAnchor.current;
      pendingAnchor.current = null;
      const vpRect = vp.getBoundingClientRect();
      vp.scrollLeft = a.relX * scale - (a.clientX - vpRect.left);
      vp.scrollTop = a.relY * scale - (a.clientY - vpRect.top);
    } else if (centerPending.current && content) {
      centerPending.current = false;
      vp.scrollLeft = (content.offsetWidth - vp.clientWidth) / 2;
      vp.scrollTop = (content.offsetHeight - vp.clientHeight) / 2;
    }
  }, [scale]);

  // Wheel-zoom, bound non-passively so we can preventDefault and stop the event
  // from bubbling up to the outer canvas's wheel-zoom handler.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      zoomAtClient(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    };
    vp.addEventListener("wheel", handler, { passive: false });
    return () => vp.removeEventListener("wheel", handler);
  }, [zoomAtClient]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const it = interactionRef.current;
      if (!it) return;

      if (it.kind === "pan") {
        const vp = viewportRef.current;
        if (!vp) return;
        vp.scrollLeft = it.startScroll.left - (e.clientX - it.startClient.x);
        vp.scrollTop = it.startScroll.top - (e.clientY - it.startClient.y);
        return;
      }

      const p = normFromEvent(e.clientX, e.clientY);
      if (!p) return;

      if (it.kind === "draw") {
        it.current = p;
        setDraft(drawReveal(it.start, p));
      } else if (it.kind === "movePin") {
        if (!it.moved && isDrag(it.startClient, { x: e.clientX, y: e.clientY })) it.moved = true;
        setWork({
          ...seedBase(),
          pins: seedPins().map((pin) => (pin.id === it.id ? { ...pin, x: clamp01(p.x), y: clamp01(p.y) } : pin)),
        });
      } else if (it.kind === "moveReveal") {
        const dx = p.x - it.lastNorm.x;
        const dy = p.y - it.lastNorm.y;
        it.lastNorm = p;
        setWork({
          ...seedBase(),
          reveals: seedReveals().map((r) => (r.id === it.id ? moveReveal(r, dx, dy) : r)),
        });
      } else if (it.kind === "resizeReveal") {
        const dx = p.x - it.lastNorm.x;
        const dy = p.y - it.lastNorm.y;
        it.lastNorm = p;
        setWork({
          ...seedBase(),
          reveals: seedReveals().map((r) => (r.id === it.id ? resizeReveal(r, it.handle, dx, dy) : r)),
        });
      } else if (it.kind === "moveToken") {
        if (!it.moved && isDrag(it.startClient, { x: e.clientX, y: e.clientY })) it.moved = true;
        const snapped = snapToGrid(p, locationRef.current.grid, gridAspect());
        setWork({
          ...seedBase(),
          tokens: seedTokens().map((t) =>
            t.id === it.id ? { ...t, x: snapped.x, y: snapped.y } : t,
          ),
        });
      } else if (it.kind === "resizeToken") {
        setWork({
          ...seedBase(),
          tokens: seedTokens().map((t) => {
            if (t.id !== it.id) return t;
            const size = Math.max(0.01, Math.min(0.6, 2 * Math.abs(p.x - t.x)));
            return { ...t, size };
          }),
        });
      }
    };

    const onUp = () => {
      const it = interactionRef.current;
      if (!it) return;
      interactionRef.current = null;
      setBusy(false);
      const change = onChangeRef.current;

      if (it.kind === "pan") return;

      if (it.kind === "draw") {
        setDraft(null);
        // Ignore a bare click (no drag) so accidental taps don't litter the map.
        if (it.current.x !== it.start.x || it.current.y !== it.start.y) {
          const rect = drawReveal(it.start, it.current);
          change({ reveals: [...locationRef.current.reveals, { id: revealId(), mode: "reveal", ...rect }] });
        }
        return;
      }
      const w = workRef.current;
      if (w) {
        if (it.kind === "movePin") {
          if (it.moved) change({ pins: w.pins });
        } else if (it.kind === "moveReveal" || it.kind === "resizeReveal") {
          change({ reveals: w.reveals });
        } else if (it.kind === "resizeToken") {
          change({ tokens: w.tokens.map(toStoredToken) });
        } else if (it.kind === "moveToken") {
          if (it.moved) change({ tokens: w.tokens.map(toStoredToken) });
        }
      }
      setWork(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // Listeners read everything through refs, so they only need to bind once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginPinDrag = (e: React.PointerEvent, id: string) => {
    if (toolRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    interactionRef.current = {
      kind: "movePin",
      id,
      startClient: { x: e.clientX, y: e.clientY },
      moved: false,
    };
    setBusy(true);
  };

  const beginRevealMove = (e: React.PointerEvent, id: string) => {
    if (toolRef.current) return;
    const p = normFromEvent(e.clientX, e.clientY);
    if (!p) return;
    e.stopPropagation();
    e.preventDefault();
    interactionRef.current = { kind: "moveReveal", id, lastNorm: p };
    setBusy(true);
  };

  const beginRevealResize = (e: React.PointerEvent, id: string, handle: ResizeHandle) => {
    const p = normFromEvent(e.clientX, e.clientY);
    if (!p) return;
    e.stopPropagation();
    e.preventDefault();
    interactionRef.current = { kind: "resizeReveal", id, handle, lastNorm: p };
    setBusy(true);
  };

  const beginTokenDrag = (e: React.PointerEvent, id: string) => {
    if (toolRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedTokenId(id);
    interactionRef.current = {
      kind: "moveToken",
      id,
      startClient: { x: e.clientX, y: e.clientY },
      moved: false,
    };
    setBusy(true);
  };

  const beginTokenResize = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    interactionRef.current = { kind: "resizeToken", id };
    setBusy(true);
  };

  // Pointer-down on empty map: draw a reveal (reveal tool) or pan (no tool).
  const onContentPointerDown = (e: React.PointerEvent) => {
    if (calibrating) return; // clicks drive calibration; don't pan
    const t = toolRef.current;
    if (t === "reveal") {
      const p = normFromEvent(e.clientX, e.clientY);
      if (!p) return;
      e.preventDefault();
      interactionRef.current = { kind: "draw", start: p, current: p };
      setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
      setBusy(true);
    } else if (t === null) {
      const vp = viewportRef.current;
      if (!vp) return;
      e.preventDefault();
      interactionRef.current = {
        kind: "pan",
        startClient: { x: e.clientX, y: e.clientY },
        startScroll: { left: vp.scrollLeft, top: vp.scrollTop },
      };
      setBusy(true);
    }
  };

  const onContentClick = (e: React.MouseEvent) => {
    const p = normFromEvent(e.clientX, e.clientY);
    if (!p) return;
    if (calibrating) {
      if (!calibPoint.current) {
        calibPoint.current = p; // first intersection
        return;
      }
      const p1 = calibPoint.current;
      const a = gridAspect();
      // Cell size in width-fraction units; one axis is ~0 for an adjacent click.
      const size = Math.max(Math.abs(p.x - p1.x), Math.abs(p.y - p1.y) / a);
      if (size > 0.002) {
        const mod = (v: number) => ((v % size) + size) % size;
        updateGrid({
          size: Math.min(1, size),
          offsetX: mod(p1.x),
          offsetY: mod(p1.y / a),
          enabled: true,
          visible: true,
        });
      }
      calibPoint.current = null;
      setCalibrating(false);
      return;
    }
    if (tool === "pin") {
      onChange({
        pins: [
          ...location.pins,
          { id: pinId(), x: p.x, y: p.y, label: "", color: NEW_PIN_COLOR, playerVisible: true },
        ],
      });
    } else if (tool === "token") {
      const at = snapToGrid(p, location.grid, gridAspect());
      addToken({ x: at.x, y: at.y });
    }
  };

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgElRef.current = img;
    const nat = { w: img.naturalWidth, h: img.naturalHeight };
    naturalRef.current = nat;
    setNatural(nat);
    fitToViewport();
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

  // --- Tokens ---------------------------------------------------------------
  const sendTokens = (tokens: MapTokenDto[]) => onChange({ tokens: tokens.map(toStoredToken) });

  const addToken = (init: Partial<MapToken> & { x: number; y: number }) => {
    const id = tokenId();
    const token: MapTokenDto = {
      id,
      x: init.x,
      y: init.y,
      size: init.size ?? presetTokenSize("M", location.grid),
      label: init.label ?? "",
      color: init.color ?? DEFAULT_TOKEN_COLOR,
      imageAssetId: init.imageAssetId ?? null,
      playerVisible: init.playerVisible ?? true,
      hp: init.hp ?? null,
      hpMax: init.hpMax ?? null,
      ac: init.ac ?? null,
      statBlock: init.statBlock ?? null,
      imageUrl: null,
    };
    sendTokens([...location.tokens, token]);
    setSelectedTokenId(id);
  };

  const updateToken = (id: string, patch: Partial<MapTokenDto>) => {
    sendTokens(location.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };
  const removeToken = (id: string) => {
    sendTokens(location.tokens.filter((t) => t.id !== id));
    if (selectedTokenId === id) setSelectedTokenId(null);
  };
  const setTokenSize = (id: string, preset: TokenSizePreset) => {
    updateToken(id, { size: presetTokenSize(preset, location.grid) });
  };

  // --- Grid -----------------------------------------------------------------
  const updateGrid = (patch: Partial<MapGrid>) => {
    onChange({ grid: { ...(location.grid ?? DEFAULT_GRID), ...patch } });
  };
  const runDetectGrid = () => {
    const img = imgElRef.current;
    if (!img) return;
    const found = detectGrid(img);
    if (found) {
      onChange({ grid: { ...(location.grid ?? DEFAULT_GRID), ...found, enabled: true, visible: true } });
    } else {
      // Fall back to a default grid the GM can hand-tune.
      onChange({ grid: location.grid ?? DEFAULT_GRID });
    }
  };

  const contentSize = natural
    ? { width: natural.w * scale, height: natural.h * scale }
    : { width: "max-content" as const, height: "auto" as const };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-900/40 px-2 py-1.5">
        <input
          className="input flex-1"
          value={location.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Location name"
        />

        {/* Segmented tool group */}
        <div className="flex shrink-0 items-center rounded-lg border border-ink-700 bg-ink-900/60 p-0.5">
          {TOOLS.map((t) => (
            <button
              key={t.tool}
              className={clsx(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40",
                tool === t.tool
                  ? "bg-accent-600 text-white shadow-sm"
                  : "text-ink-300 hover:bg-ink-800 hover:text-ink-50",
              )}
              onClick={() => selectTool(tool === t.tool ? null : t.tool)}
              disabled={!location.imageUrl}
              title={t.title}
            >
              <span aria-hidden className="text-[11px] leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <label className="btn-ghost shrink-0 cursor-pointer px-2 py-1 text-xs" title="Upload a map image">
          <span aria-hidden>⬆</span>
          <span className="hidden md:inline">Map</span>
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
          className="btn-ghost shrink-0 px-2 py-1"
          onClick={() => setShowPanel((s) => !s)}
          title={showPanel ? "Hide panel" : "Show panel"}
          aria-label={showPanel ? "Hide editor panel" : "Show editor panel"}
          aria-expanded={showPanel}
        >
          {showPanel ? "⟩" : "⟨"}
        </button>
        <InlineConfirm onConfirm={onDelete} title="Delete location" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map canvas */}
        <div className="relative flex-1 bg-ink-950">
          {location.imageUrl ? (
            <>
              <div
                ref={viewportRef}
                className={clsx(
                  "absolute inset-0 overflow-auto",
                  tool || calibrating ? "cursor-crosshair" : busy ? "cursor-grabbing" : "cursor-grab",
                )}
              >
                <div
                  ref={contentRef}
                  className="relative select-none"
                  style={contentSize}
                  onPointerDown={onContentPointerDown}
                  onClick={onContentClick}
                >
                  <img
                    src={location.imageUrl}
                    alt={location.name}
                    draggable={false}
                    onLoad={onImgLoad}
                    className="block"
                    style={
                      natural
                        ? { width: "100%", height: "100%" }
                        : { maxWidth: "none", width: "auto", height: "auto" }
                    }
                  />
                  {/* Grid overlay */}
                  {grid && natural && <GridOverlay grid={grid} aspect={aspect} />}
                  {/* Reveals — interactive on the GM canvas (move + resize). */}
                  {reveals.map((r) => (
                    <RevealRect
                      key={r.id}
                      reveal={r}
                      interactive={!tool}
                      onMoveStart={(e) => beginRevealMove(e, r.id)}
                      onResizeStart={(e, h) => beginRevealResize(e, r.id, h)}
                    />
                  ))}
                  {/* Draft rectangle being drawn. */}
                  {draft && (
                    <div
                      className="pointer-events-none absolute border-2 border-dashed border-amber-300 bg-amber-300/10"
                      style={{
                        left: `${draft.x * 100}%`,
                        top: `${draft.y * 100}%`,
                        width: `${draft.w * 100}%`,
                        height: `${draft.h * 100}%`,
                      }}
                    />
                  )}
                  {/* Pins — draggable on the GM canvas. */}
                  {pins.map((p) => (
                    <div
                      key={p.id}
                      className={clsx(
                        "absolute -translate-x-1/2 -translate-y-1/2",
                        tool ? "pointer-events-none" : "cursor-grab touch-none active:cursor-grabbing",
                      )}
                      style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                      title={p.label || "(unlabeled)"}
                      onPointerDown={(e) => beginPinDrag(e, p.id)}
                    >
                      <div
                        className={clsx(
                          "h-3.5 w-3.5 rounded-full border-2 border-ink-950 shadow",
                          !p.playerVisible && "opacity-60",
                        )}
                        style={{ backgroundColor: p.color }}
                      />
                      {p.label && (
                        <span className="pointer-events-none absolute left-3 top-0 whitespace-nowrap rounded bg-ink-900/80 px-1.5 py-0.5 text-xs text-ink-50">
                          {p.label}
                        </span>
                      )}
                    </div>
                  ))}
                  {/* Tokens — draggable; selected token shows a resize handle. */}
                  {tokens.map((t) => {
                    const hiddenFromPlayers =
                      !t.playerVisible || !isPointRevealed({ x: t.x, y: t.y }, reveals);
                    return (
                      <div
                        key={t.id}
                        className={clsx(
                          "absolute -translate-x-1/2 -translate-y-1/2",
                          tool ? "pointer-events-none" : "cursor-grab touch-none active:cursor-grabbing",
                          selectedTokenId === t.id && "z-[3]",
                        )}
                        style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, width: `${t.size * 100}%` }}
                        onPointerDown={(e) => beginTokenDrag(e, t.id)}
                      >
                        <div className="relative" style={{ aspectRatio: "1 / 1" }}>
                          <div
                            className={clsx(
                              "absolute inset-0 overflow-hidden rounded-full border-2 shadow",
                              selectedTokenId === t.id && "ring-2 ring-accent-400",
                              hiddenFromPlayers && "opacity-50",
                            )}
                            style={{
                              borderColor: t.color,
                              backgroundColor: t.imageUrl ? "#0000" : t.color,
                            }}
                          >
                            {t.imageUrl ? (
                              <img src={t.imageUrl} alt="" draggable={false} className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[8px] font-bold text-black/80">
                                {t.label.trim().slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {hiddenFromPlayers && (
                            <span className="pointer-events-none absolute -right-1 -top-1 text-[8px]" title="Hidden from players">
                              🚫
                            </span>
                          )}
                          {t.ac != null && (
                            <span
                              className="pointer-events-none absolute -left-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-ink-950 bg-sky-500 px-0.5 text-[8px] font-bold leading-none text-white shadow"
                              title="Armor Class"
                            >
                              {t.ac}
                            </span>
                          )}
                          {/* Resize handle (only on the selected token, no tool active). */}
                          {selectedTokenId === t.id && !tool && (
                            <div
                              className="absolute -bottom-1 -right-1 h-2.5 w-2.5 cursor-nwse-resize rounded-sm border border-ink-950 bg-accent-300 touch-none"
                              onPointerDown={(e) => beginTokenResize(e, t.id)}
                            />
                          )}
                        </div>
                        {t.label && (
                          <div className="pointer-events-none mt-0.5 whitespace-nowrap text-center text-[8px] leading-tight text-ink-50 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                            {t.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Zoom controls */}
              <div className="absolute bottom-2 right-2 z-10 flex flex-col overflow-hidden rounded border border-ink-700 bg-ink-900/90 text-ink-200 shadow">
                <button
                  className="px-2 py-1 hover:bg-ink-800"
                  onClick={() => zoomAtClient(1.25, centerX(viewportRef), centerY(viewportRef))}
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  className="px-2 py-1 hover:bg-ink-800"
                  onClick={() => zoomAtClient(0.8, centerX(viewportRef), centerY(viewportRef))}
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <button className="px-2 py-1 text-xs hover:bg-ink-800" onClick={fitToViewport} title="Fit to view" aria-label="Fit map to view">
                  ⤢
                </button>
              </div>
              <div
                className={clsx(
                  "pointer-events-none absolute left-2 top-2 z-10 rounded px-1.5 py-0.5 text-[10px]",
                  calibrating ? "bg-accent-600 text-white" : "bg-ink-900/70 text-ink-400",
                )}
              >
                {calibrating
                  ? calibPoint.current
                    ? "Now click the next grid line / intersection"
                    : "Click one grid intersection, then the adjacent one"
                  : tool === "pin"
                    ? "Click to drop a pin"
                    : tool === "reveal"
                      ? "Drag to draw a reveal"
                      : tool === "token"
                        ? "Click to drop a token"
                        : "Scroll to zoom · drag to pan · drag tokens to move"}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-sm text-ink-400">
              No image. Use “Upload map” to add one.
            </div>
          )}
        </div>

        {/* Right column: tabbed editor (tokens / reveals / pins / grid / notes) */}
        {showPanel && (
          <aside className="flex w-72 min-w-[18rem] flex-col border-l border-ink-700 bg-ink-900/40">
            {/* Tab bar */}
            <div className="flex shrink-0 border-b border-ink-700">
              {(
                [
                  ["tokens", "Tokens", location.tokens.length],
                  ["reveals", "Reveals", location.reveals.length],
                  ["pins", "Pins", location.pins.length],
                  ["grid", "Grid", null],
                  ["notes", "Notes", null],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  onClick={() => setPanelTab(id)}
                  className={clsx(
                    "flex-1 border-b-2 px-1 py-2 text-[11px] font-medium transition-colors",
                    panelTab === id
                      ? "border-accent-500 text-ink-50"
                      : "border-transparent text-ink-400 hover:text-ink-200",
                  )}
                >
                  {label}
                  {count !== null && count > 0 && (
                    <span className="ml-1 rounded-full bg-ink-800 px-1 text-[9px] text-ink-300">{count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-3 text-xs">
              {panelTab === "tokens" && (
                <TokenPanel
                  campaignId={campaignId}
                  tokens={location.tokens}
                  selectedTokenId={selectedTokenId}
                  setSelectedTokenId={setSelectedTokenId}
                  addToken={addToken}
                  updateToken={updateToken}
                  removeToken={removeToken}
                  setTokenSize={setTokenSize}
                  uploadAsset={uploadAsset}
                />
              )}

              {panelTab === "reveals" && (
                <div className="space-y-1.5">
                  {location.reveals.length === 0 && (
                    <EmptyHint>Pick the <b>Reveal</b> tool, then drag on the map to carve fog. Drag a box to move it, or a handle to resize.</EmptyHint>
                  )}
                  {location.reveals.map((r) => (
                    <div key={r.id} className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900 p-2">
                      <span
                        className={clsx(
                          "h-2.5 w-2.5 shrink-0 rounded-sm border",
                          r.mode === "reveal" ? "border-amber-400 bg-amber-300/40" : "border-sky-400 bg-sky-300/40",
                        )}
                      />
                      <select
                        className="input flex-1"
                        value={r.mode}
                        onChange={(e) => updateReveal(r.id, { mode: e.target.value as MapReveal["mode"] })}
                      >
                        <option value="reveal">Reveal area</option>
                        <option value="hide">Hide area</option>
                      </select>
                      <button className="btn-ghost px-1.5 py-1" onClick={() => removeReveal(r.id)} title="Remove">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {panelTab === "pins" && (
                <div className="space-y-1.5">
                  {location.pins.length === 0 && (
                    <EmptyHint>Pick the <b>Pin</b> tool, then click the map. Drag a pin to move it.</EmptyHint>
                  )}
                  {location.pins.map((p) => (
                    <div key={p.id} className="rounded-lg border border-ink-700 bg-ink-900 p-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={p.color}
                          onChange={(e) => updatePin(p.id, { color: e.target.value })}
                          className="h-7 w-7 shrink-0 cursor-pointer rounded border border-ink-700 bg-transparent"
                        />
                        <input
                          className="input flex-1"
                          value={p.label}
                          placeholder="Label"
                          onChange={(e) => updatePin(p.id, { label: e.target.value })}
                        />
                        <button className="btn-ghost px-1.5 py-1" onClick={() => removePin(p.id)} title="Remove pin">
                          ×
                        </button>
                      </div>
                      <label className="mt-1.5 flex items-center gap-1.5 text-ink-300">
                        <input
                          type="checkbox"
                          checked={p.playerVisible}
                          onChange={(e) => updatePin(p.id, { playerVisible: e.target.checked })}
                        />
                        Visible to players
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {panelTab === "grid" && (
                <GridPanel
                  grid={location.grid}
                  updateGrid={updateGrid}
                  onDetect={runDetectGrid}
                  onCalibrate={() => {
                    calibPoint.current = null;
                    setCalibrating(true);
                  }}
                  calibrating={calibrating}
                  hasImage={Boolean(location.imageUrl)}
                />
              )}

              {panelTab === "notes" && (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 font-medium text-ink-300">Player notes</div>
                    <p className="mb-1 text-[10px] text-ink-400">Shown to players when this map is shared.</p>
                    <textarea
                      className="input min-h-[80px]"
                      value={location.playerNotes ?? ""}
                      onChange={(e) => onChange({ playerNotes: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="mb-1 font-medium text-ink-300">GM notes</div>
                    <p className="mb-1 text-[10px] text-ink-400">Private — never sent to players.</p>
                    <textarea
                      className="input min-h-[80px]"
                      value={location.gmNotes ?? ""}
                      onChange={(e) => onChange({ gmNotes: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/** Resize handles: position class + cursor + which edges each affects. */
const RESIZE_HANDLES: { handle: ResizeHandle; pos: string; cursor: string }[] = [
  { handle: "nw", pos: "left-0 top-0", cursor: "cursor-nwse-resize" },
  { handle: "n", pos: "left-1/2 top-0", cursor: "cursor-ns-resize" },
  { handle: "ne", pos: "right-0 top-0", cursor: "cursor-nesw-resize" },
  { handle: "e", pos: "right-0 top-1/2", cursor: "cursor-ew-resize" },
  { handle: "se", pos: "right-0 bottom-0", cursor: "cursor-nwse-resize" },
  { handle: "s", pos: "left-1/2 bottom-0", cursor: "cursor-ns-resize" },
  { handle: "sw", pos: "left-0 bottom-0", cursor: "cursor-nesw-resize" },
  { handle: "w", pos: "left-0 top-1/2", cursor: "cursor-ew-resize" },
];

function RevealRect({
  reveal,
  interactive,
  onMoveStart,
  onResizeStart,
}: {
  reveal: MapReveal;
  interactive: boolean;
  onMoveStart: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, handle: ResizeHandle) => void;
}) {
  return (
    <div
      className={clsx(
        "absolute border-2",
        reveal.mode === "reveal"
          ? "border-amber-400/70 bg-amber-300/10"
          : "border-sky-400/70 bg-sky-300/10",
        interactive ? "cursor-move touch-none" : "pointer-events-none",
      )}
      style={{
        left: `${reveal.x * 100}%`,
        top: `${reveal.y * 100}%`,
        width: `${reveal.w * 100}%`,
        height: `${reveal.h * 100}%`,
      }}
      onPointerDown={interactive ? onMoveStart : undefined}
    >
      {interactive &&
        RESIZE_HANDLES.map(({ handle, pos, cursor }) => (
          <div
            key={handle}
            className={clsx(
              "absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-ink-950 bg-amber-300 touch-none",
              pos,
              cursor,
            )}
            onPointerDown={(e) => onResizeStart(e, handle)}
          />
        ))}
    </div>
  );
}

const SIZE_PRESETS: TokenSizePreset[] = ["S", "M", "L", "Huge"];

/** A muted helper line shown when a tab/list is empty. */
function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-ink-700 bg-ink-900/40 p-2.5 leading-relaxed text-ink-400">
      {children}
    </p>
  );
}

function TokenPanel({
  campaignId,
  tokens,
  selectedTokenId,
  setSelectedTokenId,
  addToken,
  updateToken,
  removeToken,
  setTokenSize,
  uploadAsset,
}: {
  campaignId: string;
  tokens: MapTokenDto[];
  selectedTokenId: string | null;
  setSelectedTokenId: (id: string | null) => void;
  addToken: (init: Partial<MapToken> & { x: number; y: number }) => void;
  updateToken: (id: string, patch: Partial<MapTokenDto>) => void;
  removeToken: (id: string) => void;
  setTokenSize: (id: string, preset: TokenSizePreset) => void;
  uploadAsset: ReturnType<typeof useUploadAsset>;
}) {
  const [spawnOpen, setSpawnOpen] = useState(false);
  const [sheetTokenId, setSheetTokenId] = useState<string | null>(null);
  const sheetToken = tokens.find((t) => t.id === sheetTokenId) ?? null;

  return (
    <div>
      {/* Action bar */}
      <div className="mb-2 flex items-center gap-1.5">
        <button className="btn-primary flex-1 px-2 py-1.5 text-xs" onClick={() => addToken({ x: 0.5, y: 0.5 })}>
          + Add token
        </button>
        <button
          className={clsx("btn-ghost px-2 py-1.5 text-xs", spawnOpen && "bg-ink-800 text-ink-50")}
          onClick={() => setSpawnOpen((v) => !v)}
          title="Create a token from a party member or monster"
        >
          Spawn ▾
        </button>
      </div>

      {spawnOpen && (
        <SpawnPicker
          campaignId={campaignId}
          onSpawn={(init) => {
            addToken({ x: 0.5, y: 0.5, ...init });
            setSpawnOpen(false);
          }}
        />
      )}

      {tokens.length === 0 ? (
        <EmptyHint>
          <b>+ Add token</b> drops one at the center, or pick the <b>Token</b> tool and click the map.
          Drag tokens to move them; tokens under fog are hidden from players.
        </EmptyHint>
      ) : (
        <div className="space-y-1.5">
          {tokens.map((t) => (
            <div
              key={t.id}
              className={clsx(
                "rounded-lg border bg-ink-900 p-2 transition-colors",
                selectedTokenId === t.id ? "border-accent-500 ring-1 ring-accent-500/40" : "border-ink-700",
              )}
              onClick={() => setSelectedTokenId(t.id)}
            >
              <div className="flex items-center gap-1.5">
                {/* Avatar preview */}
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-[9px] font-bold text-black/80"
                  style={{ borderColor: t.color, backgroundColor: t.imageUrl ? "#0000" : t.color }}
                >
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    t.label.trim().slice(0, 2).toUpperCase() || "?"
                  )}
                </span>
                <input
                  className="input flex-1"
                  value={t.label}
                  placeholder="Name"
                  onChange={(e) => updateToken(t.id, { label: e.target.value })}
                />
                <input
                  type="color"
                  value={t.color}
                  onChange={(e) => updateToken(t.id, { color: e.target.value })}
                  className="h-7 w-7 shrink-0 cursor-pointer rounded border border-ink-700 bg-transparent"
                  title="Token color"
                />
                <button className="btn-ghost px-1.5 py-1" onClick={() => removeToken(t.id)} title="Remove token">
                  ×
                </button>
              </div>

              {/* Size + art */}
              <div className="mt-2 flex items-center gap-1">
                <div className="flex items-center rounded-md border border-ink-700 bg-ink-950/40 p-0.5">
                  {SIZE_PRESETS.map((s) => (
                    <button
                      key={s}
                      className="rounded px-1.5 py-0.5 text-[10px] text-ink-300 hover:bg-ink-800 hover:text-ink-50"
                      onClick={() => setTokenSize(t.id, s)}
                      title={`Size: ${s}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <label className="btn-ghost ml-auto cursor-pointer px-1.5 py-1 text-[10px]" title="Upload token art">
                  {t.imageAssetId ? "Replace art" : "Add art"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        uploadAsset.mutate(f, {
                          onSuccess: (asset) => updateToken(t.id, { imageAssetId: asset.id }),
                        });
                      e.target.value = "";
                    }}
                  />
                </label>
                {t.imageAssetId && (
                  <button
                    className="btn-ghost px-1.5 py-1 text-[10px]"
                    onClick={() => updateToken(t.id, { imageAssetId: null })}
                    title="Clear art"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* HP + AC */}
              <div className="mt-2 flex items-center gap-1.5 text-ink-300">
                <span className="w-6 text-[10px] uppercase tracking-wide text-ink-400">HP</span>
                <input
                  type="number"
                  className="input w-14"
                  value={t.hp ?? ""}
                  placeholder="–"
                  onChange={(e) => updateToken(t.id, { hp: e.target.value === "" ? null : Number(e.target.value) })}
                />
                <span className="text-ink-400">/</span>
                <input
                  type="number"
                  className="input w-14"
                  value={t.hpMax ?? ""}
                  placeholder="–"
                  onChange={(e) => updateToken(t.id, { hpMax: e.target.value === "" ? null : Number(e.target.value) })}
                />
                <span className="ml-2 w-6 text-[10px] uppercase tracking-wide text-ink-400">AC</span>
                <input
                  type="number"
                  className="input w-14"
                  value={t.ac ?? ""}
                  placeholder="–"
                  onChange={(e) => updateToken(t.id, { ac: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-ink-300">
                  <input
                    type="checkbox"
                    checked={t.playerVisible}
                    onChange={(e) => updateToken(t.id, { playerVisible: e.target.checked })}
                  />
                  Visible to players
                </label>
                <button className="btn-ghost px-2 py-0.5 text-[10px]" onClick={() => setSheetTokenId(t.id)}>
                  Stat sheet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sheetToken && (
        <CreatureSheetModal
          open
          onClose={() => setSheetTokenId(null)}
          title={sheetToken.label || "Token"}
          subtitle="Token stat block"
          portraitUrl={sheetToken.imageUrl}
          campaignId={campaignId}
          rollerName={sheetToken.label || "Token"}
          stats={sheetToken.statBlock ?? emptyStatBlock()}
          hideHp
          onChange={(next) => updateToken(sheetToken.id, { statBlock: next, ac: next.ac })}
        />
      )}
    </div>
  );
}

/** Pre-fills a token from a Party member or Bestiary monster. */
function SpawnPicker({
  campaignId,
  onSpawn,
}: {
  campaignId: string;
  onSpawn: (init: Partial<MapToken>) => void;
}) {
  const party = useParty(campaignId);
  const monsters = useMonsters({ campaignId });

  return (
    <div className="mb-2 max-h-48 overflow-auto rounded-lg border border-ink-700 bg-ink-950/70 p-1.5 shadow-inner">
      <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">Party</div>
      {party.data?.length ? (
        party.data.map((m) => (
          <button
            key={m.id}
            className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left hover:bg-ink-800"
            onClick={() =>
              onSpawn({
                label: m.name,
                hp: m.hp,
                hpMax: m.hpMax,
                ac: m.stats.ac,
                imageAssetId: m.portraitAssetId,
                color: "#34d399",
                statBlock: m.stats,
              })
            }
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            <span className="truncate">{m.name}</span>
            <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-400">{m.hp}/{m.hpMax}</span>
          </button>
        ))
      ) : (
        <div className="px-2 py-1 text-ink-500">No party members.</div>
      )}

      <div className="mb-1 mt-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-red-400/80">Bestiary</div>
      {monsters.data?.length ? (
        monsters.data.map((m) => {
          const hp = m.stats.hp;
          return (
            <button
              key={m.id}
              className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left hover:bg-ink-800"
              onClick={() =>
                onSpawn({
                  label: m.name,
                  hp: m.stats.hp,
                  hpMax: m.stats.hpMax ?? m.stats.hp,
                  ac: m.stats.ac,
                  color: "#f87171",
                  statBlock: m.stats,
                })
              }
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" />
              <span className="truncate">{m.name}</span>
              {hp !== null && <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-400">{hp} hp</span>}
            </button>
          );
        })
      ) : (
        <div className="px-2 py-1 text-ink-500">No monsters.</div>
      )}
    </div>
  );
}

function GridPanel({
  grid,
  updateGrid,
  onDetect,
  onCalibrate,
  calibrating,
  hasImage,
}: {
  grid: MapGrid | null;
  updateGrid: (patch: Partial<MapGrid>) => void;
  onDetect: () => void;
  onCalibrate: () => void;
  calibrating: boolean;
  hasImage: boolean;
}) {
  const size = grid?.size ?? 0.05;
  const columns = Math.max(1, Math.round(1 / size));

  return (
    <section className="space-y-3">
      {/* Set-up actions */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          className={clsx("btn-ghost px-2 py-1.5 text-xs", calibrating && "bg-accent-600 text-white")}
          onClick={onCalibrate}
          disabled={!hasImage}
          title="Click two adjacent grid lines on the map to set the grid"
        >
          {calibrating ? "Click the map…" : "⊹ Calibrate"}
        </button>
        <button
          className="btn-ghost px-2 py-1.5 text-xs"
          onClick={onDetect}
          disabled={!hasImage}
          title="Best-effort auto-detect from the map image"
        >
          ⌖ Auto-detect
        </button>
      </div>
      <p className="text-[10px] leading-relaxed text-ink-400">
        <b>Calibrate</b> is the reliable way: click two adjacent grid intersections on the map.
        Or set how many squares span the map's width below.
      </p>

      {/* Toggles + color */}
      <div className="flex items-center gap-3 text-ink-300">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={grid?.enabled ?? false} onChange={(e) => updateGrid({ enabled: e.target.checked })} />
          Snap
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={grid?.visible ?? false} onChange={(e) => updateGrid({ visible: e.target.checked })} />
          Show
        </label>
        <input
          type="color"
          value={grid?.color ?? "#38bdf8"}
          onChange={(e) => updateGrid({ color: e.target.value })}
          className="ml-auto h-6 w-6 cursor-pointer rounded border border-ink-700 bg-transparent"
          title="Grid color"
        />
      </div>

      {/* Squares across */}
      <label className="flex items-center gap-2 text-ink-400">
        <span className="shrink-0">Squares across</span>
        <input
          type="number"
          min={1}
          max={200}
          className="input w-20"
          value={columns}
          onChange={(e) => {
            const n = Math.round(Number(e.target.value));
            if (n >= 1) updateGrid({ size: 1 / n });
          }}
        />
        <input
          type="range"
          min={2}
          max={60}
          step={1}
          value={Math.min(60, columns)}
          onChange={(e) => updateGrid({ size: 1 / Number(e.target.value) })}
          className="flex-1"
        />
      </label>

      {/* Offsets */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-1 text-ink-400">
          <span>Offset X</span>
          <input
            type="range"
            min={0}
            max={size}
            step={size / 50}
            value={grid?.offsetX ?? 0}
            onChange={(e) => updateGrid({ offsetX: Number(e.target.value) })}
            className="flex-1"
          />
        </label>
        <label className="flex items-center gap-1 text-ink-400">
          <span>Offset Y</span>
          <input
            type="range"
            min={0}
            max={size}
            step={size / 50}
            value={grid?.offsetY ?? 0}
            onChange={(e) => updateGrid({ offsetY: Number(e.target.value) })}
            className="flex-1"
          />
        </label>
      </div>
    </section>
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
