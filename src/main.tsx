import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { ThemeProvider } from "next-themes";
import { RefreshCw } from "lucide-react";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import "./index.css";
import "./types/global.d.ts";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Home = lazy(() => import("./pages/Home.tsx"));
const GameSetup = lazy(() => import("./pages/GameSetup.tsx"));
const GamePlay = lazy(() => import("./pages/GamePlay.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const History = lazy(() => import("./pages/History.tsx"));
const Leaderboard = lazy(() => import("./pages/Leaderboard.tsx"));
const OnlineLobby = lazy(() => import("./pages/OnlineLobby.tsx"));
const OnlineGamePlay = lazy(() => import("./pages/OnlineGamePlay.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

// Guard against a missing VITE_CONVEX_URL — without this the constructor
// throws "No address provided" and the user sees a white screen. Instead we
// render a game-styled connection-error screen with a Retry button.
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

/**
 * Game-styled connection-error screen shown when VITE_CONVEX_URL is missing
 * or empty (e.g. misconfigured deployment). Uses Heritage tokens.
 */
function ConnectionErrorScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
      }}
    >
      <div className="w-full max-w-sm rounded-3xl border border-destructive/40 bg-gradient-to-br from-destructive/15 via-card to-card p-8 text-center shadow-paper-lg">
        <div className="mb-3 text-5xl" role="img" aria-label="disconnected">
          📡
        </div>
        <h2 className="font-display text-2xl font-bold text-destructive">
          Connection error
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Couldn&rsquo;t reach the game server. Please check your connection
          and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/60 bg-gradient-to-b from-primary to-primary/70 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[0_5px_0_0_oklch(0.5_0.12_55)] transition-all hover:shadow-[0_4px_0_0_oklch(0.5_0.12_55)] active:translate-y-1 active:shadow-[0_3px_0_0_oklch(0.5_0.12_55)]"
        >
          <RefreshCw className="size-4" />
          Retry
        </button>
      </div>
    </div>
  );
}



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      {convex ? (
        <ConvexAuthProvider client={convex}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <BrowserRouter>
              <RouteSyncer />
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<AuthPage redirectAfterAuth="/home" />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/game/setup" element={<GameSetup />} />
                  <Route path="/game/play" element={<GamePlay />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/lobby" element={<OnlineLobby />} />
                  <Route path="/game/online/:roomCode" element={<OnlineGamePlay />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
          <Toaster />
          <ConnectionBadge />
        </ConvexAuthProvider>
      ) : (
        <ConnectionErrorScreen />
      )}
    </InstrumentationProvider>
  </StrictMode>,
);
