import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Komari serves a theme from /themes/<short>/dist/, so every asset URL carries
// that prefix. `short` must match komari-theme.json exactly.
const short = process.env.THEME_SHORT ?? "Mono";

export default defineConfig(({ mode }) => {
  const config: UserConfig = {
    base: `/themes/${short}/dist/`,
    plugins: [react(), tailwindcss()],
    build: {
      outDir: "dist",
      assetsDir: "assets",
      // Go's embed ignores files that start with "_".
      rollupOptions: {
        output: {
          chunkFileNames: "assets/chunk-[name]-[hash].js",
          entryFileNames: "assets/entry-[name]-[hash].js",
        },
      },
    },
  };

  if (mode === "development") {
    config.server = {
      proxy: {
        "/api": {
          target: process.env.VITE_API_TARGET ?? "http://127.0.0.1:25774",
          changeOrigin: true,
          ws: true,
        },
      },
    };
  }

  return config;
});
