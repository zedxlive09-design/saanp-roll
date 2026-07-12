/**
 * Haptics utility — works on web (navigator.vibrate) and is Capacitor-ready.
 * When wrapped in Capacitor later, swap the implementation for @capacitor/haptics
 * while keeping the same API. For now, navigator.vibrate is a progressive
 * enhancement (no-op on unsupported browsers).
 */

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 40, 30],
  warning: [20, 60, 20],
  error: [40, 40, 40, 40, 40],
};

export function haptic(pattern: HapticPattern = "light"): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // no-op — vibration not supported or denied
  }
}

/** Convenience helpers for game events. */
export const haptics = {
  tap: () => haptic("light"),
  roll: () => haptic("medium"),
  step: () => haptic("light"),
  snakeBite: () => haptic("error"),
  ladderClimb: () => haptic("success"),
  win: () => haptic("success"),
  overshoot: () => haptic("warning"),
};
