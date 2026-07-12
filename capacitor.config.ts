import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config — READY for when we wrap the web build for Play Store.
 * Not used during web development. To enable:
 *   bun add -D @capacitor/cli
 *   bun add @capacitor/core @capacitor/android
 *   bunx cap init
 *   bunx cap add android
 *   bun run build && bunx cap sync
 *
 * The web codebase is already Capacitor-ready:
 *  - Safe-area insets handled in src/index.css (.safe-area utilities + #root padding)
 *  - Haptics via navigator.vibrate (src/lib/haptics.ts) — swap for @capacitor/haptics later
 *  - PWA manifest + icons in public/
 *  - Splash asset at public/splash.png
 */
const config: CapacitorConfig = {
  appId: "dev.saanpseedhi.app",
  appName: "Saanp Seedhi",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#1c3a3a",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#1c3a3a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
