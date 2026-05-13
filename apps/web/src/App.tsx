import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LoginPage } from "./auth/LoginPage.js";
import { CampaignsPage } from "./campaigns/CampaignsPage.js";
import { CampaignDashboard } from "./campaigns/CampaignDashboard.js";
import { PlayerView } from "./player/PlayerView.js";
import { useMe } from "./auth/useAuth.js";
import type { ReactNode } from "react";

function Gate({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();
  if (me.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-400">
        Loading…
      </div>
    );
  }
  if (!me.data?.authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/player/:campaignId" element={<PlayerView />} />
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
            <CampaignDashboard />
          </Gate>
        }
      />
      <Route path="*" element={<Navigate to="/campaigns" replace />} />
    </Routes>
  );
}
