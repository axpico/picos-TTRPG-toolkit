import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useCampaign, useRotateShareToken } from "./useCampaigns.js";
import { useLogout } from "../auth/useAuth.js";
import { useLayoutSync } from "../canvas/useLayout.js";
import { InfiniteCanvas } from "../canvas/InfiniteCanvas.js";
import { listWidgets } from "../canvas/WidgetRegistry.js";
import { useCanvasStore } from "../canvas/store.js";
import { useBroadcast } from "../hooks/useBroadcast.js";
import { useCreateStickyNote } from "../modules/sticky/api.js";
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
  const createSticky = useCreateStickyNote(campaignId);
  const navigate = useNavigate();
  const rotate = useRotateShareToken();
  const [showAddMenu, setShowAddMenu] = useState(false);

  useBroadcast({
    url: `/api/stream/${campaignId}`,
    campaignId,
  });

  if (campaign.isLoading || layoutSync.isLoading) {
    return <div className="p-8 text-ink-400">Loading…</div>;
  }
  if (campaign.isError) {
    return <div className="p-8 text-red-400">Campaign not found.</div>;
  }

  const c = campaign.data!;
  const playerUrl = `${window.location.origin}/player/${c.id}?t=${c.shareToken}`;

  const dropOrigin = () => {
    const viewport = useCanvasStore.getState().layout.viewport;
    return {
      x: -viewport.x / viewport.scale + 80,
      y: -viewport.y / viewport.scale + 80,
    };
  };

  const addWidget = (type: string) => {
    const def = listWidgets().find((d) => d.type === type);
    if (!def) return;
    const { x, y } = dropOrigin();
    upsertItem({
      instanceId: uid(),
      moduleType: type,
      x,
      y,
      w: def.defaultSize.w,
      h: def.defaultSize.h,
      state: {},
    });
    setShowAddMenu(false);
  };

  const addSticky = () => {
    const { x, y } = dropOrigin();
    createSticky.mutate({ x, y });
  };

  return (
    <div className="flex h-screen flex-col bg-ink-950 text-ink-50">
      <header className="z-10 flex items-center justify-between border-b border-ink-800 bg-ink-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/campaigns" className="btn-ghost">← Campaigns</Link>
          <h1 className="text-sm font-semibold">{c.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost"
            onClick={addSticky}
            title="Drop a sticky note on the canvas"
          >
            + Sticky
          </button>
          <div className="relative">
            <button className="btn-primary" onClick={() => setShowAddMenu((v) => !v)}>
              + Add widget
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-ink-700 bg-ink-850 py-1 shadow-xl">
                {listWidgets().map((def) => (
                  <button
                    key={def.type}
                    onClick={() => addWidget(def.type)}
                    className="block w-full px-3 py-1.5 text-left text-sm text-ink-200 hover:bg-ink-800"
                  >
                    {def.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn-ghost"
            title="Open player view in a new tab"
            onClick={() => window.open(playerUrl, "_blank", "noopener")}
          >
            Player view ↗
          </button>
          <button
            className="btn-ghost"
            title="Generate a new share token (invalidates the old player URL)"
            onClick={() => {
              if (confirm("Rotate the share token? The current player URL will stop working.")) {
                rotate.mutate(c.id);
              }
            }}
          >
            Rotate token
          </button>
          <button className="btn-ghost" onClick={() => logout.mutate(undefined, { onSuccess: () => navigate("/login") })}>
            Sign out
          </button>
        </div>
      </header>
      <main className="relative flex-1 overflow-hidden">
        <InfiniteCanvas campaignId={c.id} />
      </main>
    </div>
  );
}
