import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["test/**/*.test.{ts,tsx}"],
    // Restore a working localStorage: jsdom-under-vitest on Node 22+ exposes none.
    setupFiles: ["./test/setup.ts"],
  },
});