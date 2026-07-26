import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
// `base` is where the app is served from. Root hosts (Cloudflare Pages, Vercel)
// keep "/", GitHub Pages serves under "/<repo>/" — set VITE_BASE at build time
// (the deploy workflow sets it to "/<repo>/" automatically).
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "공부 타이머",
        short_name: "공부타이머",
        description: "열품타 스타일 공부 타이머 · 노션 연동",
        lang: "ko",
        theme_color: "#eef1fb",
        background_color: "#eef1fb",
        display: "standalone",
        orientation: "any",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // App shell is precached; live schedule data (the proxy) is network-first
        // so the timer keeps working offline but Notion updates arrive when online.
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-schedule",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
