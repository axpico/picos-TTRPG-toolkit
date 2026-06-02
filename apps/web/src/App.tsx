import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { LoginPage } from "./auth/LoginPage.js";
import { RegisterPage } from "./auth/RegisterPage.js";
import { CampaignsPage } from "./campaigns/CampaignsPage.js";
import { CampaignDashboard } from "./campaigns/CampaignDashboard.js";
import { PlayerView } from "./player/PlayerView.js";
import { roleIn, useMe } from "./auth/useAuth.js";
import type { ReactNode } from "react";

function Gate({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();
  if (me.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-400">Loading…</div>
    );
  }
  if (!me.data?.authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

/** Route a campaign to the DM canvas or the player view based on the caller's role. */
function CampaignRouter() {
  const { campaignId = "" } = useParams<{ campaignId: string }>();
  const me = useMe();
  if (me.isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-ink-400">Loading…</div>;
  }
  const role = roleIn(me.data?.memberships, campaignId);
  if (!role) return <Navigate to="/campaigns" replace />;
  return role === "dm" ? <CampaignDashboard /> : <Navigate to={`/play/${campaignId}`} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/campaigns"
        element={
          <Gate>
            <CampaignsPage />
          </Gate>
        }
      />
      <Route
        path="/campaigns/:campaignId"
        element={
          <Gate>
            <CampaignRouter />
          </Gate>
        }
      />
      <Route
        path="/play/:campaignId"
        element={
          <Gate>
            <PlayerView />
          </Gate>
        }
      />
      <Route path="*" element={<Navigate to="/campaigns" replace />} />
    </Routes>
  );
}
