import { useEffect, useState } from "react";
import { Smartphone, RotateCw } from "lucide-react";

/**
 * On small screens in portrait orientation, shows a full-screen prompt
 * asking the user to rotate to landscape for the best board view.
 * Hidden on desktop / tablets (md+) and in landscape.
 */
export function LandscapePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const isSmall = window.innerWidth < 768; // below md breakpoint
      setShow(isPortrait && isSmall);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background p-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20">
        <Smartphone className="size-9 text-primary" />
      </div>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Rotate your device
        </h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Saanp Seedhi plays best in landscape. Turn your phone sideways for the
          full board view.
        </p>
      </div>
      <div className="text-primary">
        <RotateCw className="size-10 animate-pulse" />
      </div>
    </div>
  );
}
