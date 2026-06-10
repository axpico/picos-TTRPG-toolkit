import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App.js";
import { initTheme } from "./theme/useTheme.js";
import { globalToast, ToastProvider } from "./components/Toast.js";
import { ConfirmProvider } from "./components/ConfirmDialog.js";
import "./theme/tailwind.css";

// Self-hosted fonts (works offline / on the LAN) used by the theme presets.
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/cinzel/500.css";
import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/700.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/500.css";
import "@fontsource/spectral/600.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
  // Safety net: every mutation without its own onError surfaces a toast, so
  // failed saves never disappear silently. Opt out with meta.silenceErrorToast.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silenceErrorToast) return;
      if (mutation.options.onError) return;
      const message = error instanceof Error && error.message ? error.message : "Something went wrong.";
      globalToast(message, "error");
    },
  }),
});

initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
