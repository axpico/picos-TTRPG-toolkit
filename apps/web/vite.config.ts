import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Read root .env so the proxy can target the configured backend port.
  const env = loadEnv(mode, "../../", "");
  const backendPort = env.PORT ?? "3000";
  const backend = `http://127.0.0.1:${backendPort}`;

  // The server writes its actual port here when it has to fall back off the
  // configured PORT; the proxy follows it so dev keeps working either way.
  const portFile = resolve(process.cwd(), "../../.dev-server-port");
  const resolveBackend = () => {
    if (existsSync(portFile)) {
      const p = readFileSync(portFile, "utf8").trim();
      if (p) return `http://127.0.0.1:${p}`;
    }
    return backend;
  };

  return {
    plugins: [react()],
    server: {
      // Prefer 5173 but fall back to the next free port instead of crashing.
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": { target: backend, router: () => resolveBackend(), changeOrigin: false, ws: false },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
    test: {
      // Component/store tests touch document, localStorage, etc.; run them in jsdom.
      environment: "jsdom",
    },
  };
});
