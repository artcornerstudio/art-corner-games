import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { editionPlugin } from "./vite.edition";

// VITE_BASE lets the GitHub Pages workflow serve the app from /<repo>/ while
// local dev and other hosts keep the root path.
// VITE_EDITION=demo builds the free edition without the paid content. Anything else is the full game.
const edition = process.env.VITE_EDITION ?? "full";

export default defineConfig({
  define: { "import.meta.env.VITE_EDITION": JSON.stringify(edition) },
  plugins: [
    editionPlugin(edition),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Football IQ: Flag and Field",
        short_name: "Football IQ",
        description: "Learn the X's and O's of football with animated plays and quick games.",
        theme_color: "#0b1220",
        background_color: "#0b1220",
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
        globPatterns: ["**/*.{js,css,html,svg,png,webp,webmanifest}"],
        // The shared GitHub Pages site also hosts other games in sibling
        // folders (e.g. /spread-out/). This worker's scope covers the whole
        // site, so without this list its "show index.html for any page"
        // fallback would hijack those games and serve Football IQ instead.
        navigateFallbackDenylist: [/\/spread-out(\/|$)/],
        // The coach voice clips are too many to precache. Each one is kept after it is first played,
        // so read-aloud keeps working offline for everything the listener has already heard.
        runtimeCaching: [
          { urlPattern: /\/voice\/[0-9a-f]{14}\.mp3$/, handler: "CacheFirst", options: { cacheName: "coach-voice", expiration: { maxEntries: 5000 }, cacheableResponse: { statuses: [200] } } },
          { urlPattern: /\/voice\/manifest\.json$/, handler: "StaleWhileRevalidate", options: { cacheName: "coach-voice-list" } },
        ],
      },
    }),
  ],
  base: process.env.VITE_BASE ?? "/",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
