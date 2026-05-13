import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Read root .env so the proxy can target the configured backend port.
  const env = loadEnv(mode, "../../", "");
  const backendPort = env.PORT ?? "3000";
  const backend = `http://127.0.0.1:${backendPort}`;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": { target: backend, changeOrigin: false, ws: false },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
