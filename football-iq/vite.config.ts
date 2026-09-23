import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// VITE_BASE lets the GitHub Pages workflow serve the app from /<repo>/ while
// local dev and other hosts keep the root path.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Football IQ: Flag and Field",
        short_name: "Football IQ",
        description: "Learn the X's and O's of football with animated plays and quick games.",
        theme_color: "#1b5e20",
        background_color: "#f6f7f4",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Everything the app needs is precached, so it works offline after the first visit.
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        // The shared GitHub Pages site also hosts other games in sibling
        // folders (e.g. /spread-out/). This worker's scope covers the whole
        // site, so without this list its "show index.html for any page"
        // fallback would hijack those games and serve Football IQ instead.
        navigateFallbackDenylist: [/\/spread-out(\/|$)/],
      },
    }),
  ],
  base: process.env.VITE_BASE ?? "/",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
