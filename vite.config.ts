import { vlyPlugin } from "@vly-ai/integrations";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-master.png"],
      manifest: false, // we use our own manifest.webmanifest
      workbox: {
        // Cache the app shell for instant offline load.
        // Local pass-and-play works fully offline (pure client-side engine).
        // Online multiplayer + auth need the network and will fail gracefully.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,woff,ttf}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Google Fonts (Fraunces + Inter)
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "heritage-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // SW disabled in dev (dev-sw.js fetch fails in this sandbox).
      // Production builds still get full offline PWA support.
      devOptions: {
        enabled: false,
      },
    }),
    vlyPlugin(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    hmr: false,
  },
});
