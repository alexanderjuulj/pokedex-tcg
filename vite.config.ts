import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { API_PORT, WEB_PORT } from "./server/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // Listen on the LAN so phones and tablets on the same Wi-Fi can reach it.
    host: true,
    port: WEB_PORT,
    strictPort: true,
    proxy: {
      "/api": `http://127.0.0.1:${API_PORT}`,
    },
  },
});
