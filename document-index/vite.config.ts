import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { PluginOption } from "vite";

export default defineConfig({
  plugins: [react() as unknown as PluginOption],
  resolve: {
    preserveSymlinks: true,
  },
  clearScreen: false,
  server: {
    host: "0.0.0.0",
    port: 1421,
    strictPort: true,
    allowedHosts: [".monkeycode-ai.online"],
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "es2022",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
});
