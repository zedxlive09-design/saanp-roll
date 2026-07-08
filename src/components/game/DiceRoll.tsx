import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { soundManager } from "@/lib/sounds";

// [row, col] positions on a 3x3 grid (rows 1-3 top to bottom, cols 2/4/6 left to right)
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[2, 4]],
  2: [[1, 6], [3, 2]],
  3: [[1, 6], [2, 4], [3, 2]],
  4: [[1, 2], [1, 6], [3, 2], [3, 6]],
  5: [[1, 2], [1, 6], [2, 4], [3, 2], [3, 6]],
  6: [[1, 2], [1, 6], [2, 2], [2, 6], [3, 2], [3, 6]],
};

interface DiceRollProps {
  onRoll: (value: number) => void;
  disabled?: boolean;
  currentPlayerColor?: string;
  isExtraRoll?: boolean;
  /**
   * If provided, the final roll value comes from this async function
   * (e.g., a server mutation) instead of being generated locally.
   * The animation still shows random flips, but the final shown value
   * is the resolved value from this function.
   */
  serverRoll?: () => Promise<number>;
}

export function DiceRoll({
  onRoll,
  disabled = false,
  currentPlayerColor = "#6366f1",
  isExtraRoll = false,
  serverRoll,
}: DiceRollProps) {
  const [rolling, setRolling] = useState(false);
  const [lastValue, setLastValue] = useState<number | null>(null);
  const [facesKey, setFacesKey] = useState(0);

  const handleRoll = async () => {
    if (disabled || rolling) return;
    setRolling(true);
    setFacesKey((k) => k + 1);

    // Play dice rattle
    soundManager.play("dice_roll");

    // Animated tumble — rapid random flips with 3D rotation timing
    const flipCount = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < flipCount; i++) {
      await new Promise((r) => setTimeout(r, 60 + i * 30));
      setLastValue(Math.floor(Math.random() * 6) + 1);
    }

    // Final roll — either from server or local
    const finalValue = serverRoll
      ? await serverRoll()
      : Math.floor(Math.random() * 6) + 1;
    setLastValue(finalValue);
    await new Promise((r) => setTimeout(r, 200));
    setRolling(false);
    onRoll(finalValue);
  };

  const pips = lastValue ? DOT_POSITIONS[lastValue] : DOT_POSITIONS[1];

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        onClick={handleRoll}
        disabled={disabled || rolling}
        className={cn(
          "relative w-20 h-20 rounded-xl shadow-lg cursor-pointer select-none",
          "border-2 transition-colors duration-200",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-xl active:shadow-md",
        )}
        style={{
          backgroundColor: "#fafaf9",
          borderColor: currentPlayerColor,
        }}
        // 3D tumble animation during roll
        animate={
          rolling
            ? {
                rotateX: [0, 360, 720, 1080],
                rotateY: [0, 180, 540, 720],
                scale: [1, 1.08, 1.05, 1],
                boxShadow: [
                  `0 4px 6px -1px rgb(0 0 0 / 0.1)`,
                  `0 0 24px ${currentPlayerColor}60`,
                  `0 0 16px ${currentPlayerColor}40`,
                  `0 4px 6px -1px rgb(0 0 0 / 0.1)`,
                ],
              }
            : {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
              }
        }
        transition={
          rolling
            ? {
                duration: 0.8,
                ease: "easeInOut",
                times: [0, 0.3, 0.6, 1],
              }
            : { duration: 0.3 }
        }
        whileTap={rolling ? {} : { scale: 0.92 }}
      >
        {/* Dice dots */}
        <div
          className="absolute inset-2 grid grid-cols-3 grid-rows-3 gap-1"
          style={{ perspective: 200 }}
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const row = Math.floor(i / 3) + 1;
            const col = (i % 3) * 2 + 2;
            const hasDot = pips.some(([r, c]) => r === row && c === col);
            return (
              <div key={i} className="flex items-center justify-center">
                {hasDot && (
                  <motion.div
                    key={`${facesKey}-${i}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 12 }}
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: rolling ? "#a1a1aa" : "#1c1917",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Shine / glow during roll */}
        {rolling && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
          />
        )}
      </motion.button>

      <AnimatePresence mode="wait">
        {isExtraRoll && (
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs font-medium text-amber-600"
          >
            🎲 Extra roll!
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
