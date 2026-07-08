import { useTheme } from "next-themes";

/**
 * Hook for controlling the app theme (light / dark / system).
 * Wraps next-themes' useTheme for convenience and type safety.
 */
export function useAppTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  const cycleTheme = () => {
    if (theme === "system") {
      setTheme(isDark ? "light" : "dark");
    } else if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("system");
    }
  };

  return {
    /** Current theme setting: "light" | "dark" | "system" */
    theme: theme ?? "system",
    /** Whether the *resolved* (actual) theme is dark */
    isDark,
    /** Set a specific theme */
    setTheme,
    /** The user's OS-level theme preference */
    systemTheme: systemTheme ?? "light",
    /** Cycle through light → dark → system */
    cycleTheme,
  };
}
