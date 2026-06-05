import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useCampaign, useRotateJoinCode } from "./useCampaigns.js";
import { useLogout } from "../auth/useAuth.js";
import { useLayoutSync } from "../canvas/useLayout.js";
import { InfiniteCanvas } from "../canvas/InfiniteCanvas.js";
import { listWidgets } from "../canvas/WidgetRegistry.js";
import { WidgetPalette } from "../canvas/WidgetPalette.js";
import { useCanvasStore } from "../canvas/store.js";
import { useBroadcast } from "../hooks/useBroadcast.js";
import { ThemeControl } from "../theme/ThemePanel.js";
import { useConfirm } from "../components/ConfirmDialog.js";
import { useToast } from "../components/Toast.js";
import { copyText } from "../lib/clipboard.js";
import "../modules/register.js";

function uid() {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function CampaignDashboard() {
  const { campaignId = "" } = useParams<{ campaignId: string }>();
  const campaign = useCampaign(campaignId);
  const logout = useLogout();
  const layoutSync = useLayoutSync(campaignId);
  const upsertItem = useCanvasStore((s) => s.upsertItem);
  const navigate = useNavigate();
  const rotate = useRotateJoinCode();
  const confirm = useConfirm();
  const toast = useToast();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useBroadcast({ url: `/api/stream/${campaignId}`, campaignId });

  // Global shortcut: "/" or Cmd/Ctrl-K opens the widget palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (campaign.isLoading || layoutSync.isLoading) {
    return <div className="p-8 text-ink-400">Loading…</div>;
  }
  if (campaign.isError) {
    return <div className="p-8 text-red-400">Campaign not found.</div>;
  }

  const c = campaign.data!;
  const playerUrl = `${window.location.origin}/play/${c.id}`;

  // Top-left position (in content coordinates) that centers a `w`×`h` widget on
  // the visible canvas. The canvas fills `<main>` via react-zoom-pan-pinch's
  // `.react-transform-wrapper`; we map its center to content space via the
  // transform model `content = (screen - position) / scale`.
  const centerOrigin = (w: number, h: number) => {
    const viewport = useCanvasStore.getState().layout.viewport;
    const wrap = document.querySelector(".react-transform-wrapper");
    const vw = wrap?.clientWidth ?? window.innerWidth;
    const vh = wrap?.clientHeight ?? window.innerHeight;
    const cx = (vw / 2 - viewport.x) / viewport.scale;
    const cy = (vh / 2 - viewport.y) / viewport.scale;
    return { x: cx - w / 2, y: cy - h / 2 };
  };

  const addWidget = (type: string) => {
    const def = listWidgets().find((d) => d.type === type);
    if (!def) return;
    const { w, h } = def.defaultSize;
    const { x, y } = centerOrigin(w, h);
    upsertItem({
      instanceId: uid(),
      moduleType: type,
      x,
      y,
      w,
      h,
      state: {},
    });
  };

  const copyJoinCode = async () => {
    if (!c.joinCode) return;
    if (await copyText(c.joinCode)) {
      toast("Join code copied — share it with your players.", "success");
    } else {
      toast(`Join code: ${c.joinCode}`);
    }
  };

  const onRotate = async () => {
    const ok = await confirm({
      title: "Rotate join code?",
      message: "The current code stops working immediately; players who already joined keep access.",
      confirmLabel: "Rotate",
      danger: true,
    });
    if (ok) rotate.mutate(c.id, { onSuccess: () => toast("Join code rotated.", "success") });
  };

  return (
    <div className="flex h-screen flex-col text-ink-50">
      <header className="z-10 flex items-center justify-between gap-3 border-b border-ink-800/80 bg-ink-900/80 px-4 py-2 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/campaigns" className="btn-ghost shrink-0">← Campaigns</Link>
          <h1 className="display truncate text-base font-semibold">{c.name}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn-primary" onClick={() => setPaletteOpen(true)} title="Add widget (press / or ⌘K)">
            + Add widget
          </button>
          <div className="mx-1 h-5 w-px bg-ink-700" />
          {c.joinCode && (
            <button
              className="btn-ghost font-mono"
              onClick={copyJoinCode}
              title="Copy the join code for players"
            >
              Code: {c.joinCode.slice(0, 8)}…
            </button>
          )}
          <button className="btn-ghost" onClick={onRotate} title="Generate a new join code">
            Rotate
          </button>
          <button
            className="btn-ghost"
            title="Open the player view in a new tab"
            onClick={() => window.open(playerUrl, "_blank", "noopener")}
          >
            Player view ↗
          </button>
          <ThemeControl />
          <button
            className="btn-ghost"
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate("/login") })}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="relative flex-1 overflow-hidden">
        <InfiniteCanvas campaignId={c.id} />
      </main>

      <WidgetPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onAdd={addWidget} />
    </div>
  );
}
