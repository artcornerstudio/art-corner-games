import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// VITE_BASE lets the GitHub Pages workflow serve the app from /<repo>/ while
// local dev and other hosts keep the root path.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
