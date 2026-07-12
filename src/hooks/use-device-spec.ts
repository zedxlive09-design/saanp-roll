import { useEffect, useState } from "react";

export type QualityTier = "high" | "low";

/**
 * Detects device capability and returns a quality tier.
 * Used to degrade 3D / shadow / blur effects on low-spec devices.
 *
 * Heuristics:
 *  - prefers-reduced-motion → low
 *  - deviceMemory < 4GB → low
 *  - hardwareConcurrency < 4 → low
 *  - coarse pointer + small screen → low
 *  - otherwise → high
 */
export function useDeviceSpec(): {
  quality: QualityTier;
  isMobile: boolean;
  reducedMotion: boolean;
} {
  const [spec, setSpec] = useState<QualityTier>("high");
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
    };
    const mem = nav.deviceMemory ?? 4;
    const cores = nav.hardwareConcurrency ?? 4;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const small = window.innerWidth < 768;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const mobile = coarse && small;
    let tier: QualityTier = "high";
    if (reduce || mem < 2 || cores < 2) tier = "low";
    if (mobile && (mem < 2 || cores < 2)) tier = "low";

    setSpec(tier);
    setIsMobile(mobile);
    setReducedMotion(reduce);
  }, []);

  return { quality: spec, isMobile, reducedMotion };
}
