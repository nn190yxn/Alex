import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";

export default {
  plugins: [react() as unknown as PluginOption],
  resolve: {
    preserveSymlinks: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    clearMocks: true,
    setupFiles: ["./src/test/setup.ts"],
  },
};
