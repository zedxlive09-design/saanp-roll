import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Shows a slim banner when the device is offline, indicating only local
 * play is available (online multiplayer + auth need the network).
 * 8 Ball Pool style: non-blocking, dismissible feel, clear messaging.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-xs font-medium text-destructive">
      <WifiOff className="size-3.5" />
      You&apos;re offline — local play only. Online + sign-in unavailable.
    </div>
  );
}
