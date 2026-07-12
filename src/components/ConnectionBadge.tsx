import { useConvexConnectionState } from "convex/react";
import { Loader2 } from "lucide-react";

/**
 * Subtle, unobtrusive badge shown when the Convex websocket is disconnected
 * after having previously connected. Hidden on first load (before the first
 * successful connection) so users don't see a "Reconnecting" flash on cold
 * start. Uses Heritage destructive token — no hardcoded colors.
 *
 * Must be rendered inside <ConvexAuthProvider> (which wraps <ConvexProvider>)
 * so the underlying useConvexConnectionState hook has a client to read from.
 */
export function ConnectionBadge() {
  const connState = useConvexConnectionState();

  // Only show after the client has ever connected, so cold-start / loading
  // states don't flash a misleading "Reconnecting" badge.
  if (!connState.hasEverConnected || connState.isWebSocketConnected) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[200] flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/15 px-3 py-1.5 text-xs font-medium text-destructive backdrop-blur-md shadow-paper"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-3 animate-spin" />
      Reconnecting…
    </div>
  );
}
