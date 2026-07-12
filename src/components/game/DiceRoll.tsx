import { useState, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { soundManager } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";

// Pip positions on a 3x3 grid for each face value
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

export interface DiceRollHandle {
  roll: () => void;
}

interface DiceRollProps {
  onRoll: (value: number) => void;
  disabled?: boolean;
  currentPlayerColor?: string;
  isExtraRoll?: boolean;
  serverRoll?: () => Promise<number>;
}

function DiceFace({ value, size }: { value: number; size: number }) {
  const pips = PIPS[value];
  return (
    <div
      className="grid grid-cols-3 grid-rows-3 rounded-xl border-2 border-amber-900/30 bg-gradient-to-br from-amber-50 to-amber-100 p-2 shadow-lg"
      style={{ width: size, height: size }}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const hasPip = pips.some(([r, c]) => r === row && c === col);
        return (
          <div key={i} className="flex items-center justify-center">
            {hasPip && (
              <div
                className="rounded-full bg-gradient-to-br from-stone-700 to-stone-900"
                style={{
                  width: size * 0.12,
                  height: size * 0.12,
                  boxShadow: "inset 0 1px 1px oklch(0 0 0 / 0.4)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export const DiceRoll = forwardRef<DiceRollHandle, DiceRollProps>(function DiceRoll(
  { onRoll, disabled = false, currentPlayerColor = "#d97706", isExtraRoll = false, serverRoll },
  ref,
) {
  const [rolling, setRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState(6);
  const [animClass, setAnimClass] = useState("");
  const rollingRef = useRef(false);
  const onRollRef = useRef(onRoll);
  onRollRef.current = onRoll;

  useImperativeHandle(ref, () => ({
    roll: () => handleRoll({ force: true }),
  }));

  const handleRoll = useCallback(
    async (opts?: { force?: boolean }) => {
      if (rollingRef.current) return;
      if (!opts?.force && disabled) return;

      rollingRef.current = true;
      setRolling(true);
      haptics.roll();
      soundManager.play("dice_roll");

      // Tumble animation: rapidly cycle through random faces
      setAnimClass("dice-tumble");
      const flipCount = 6 + Math.floor(Math.random() * 3);
      for (let i = 0; i < flipCount; i++) {
        await new Promise((r) => setTimeout(r, 90));
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }

      // Final value
      const value = serverRoll ? await serverRoll() : Math.floor(Math.random() * 6) + 1;
      setDisplayValue(value);

      // Settle — stop the tumble, show final face
      setAnimClass("dice-settle");
      await new Promise((r) => setTimeout(r, 250));
      setAnimClass("");
      haptics.tap();

      setRolling(false);
      rollingRef.current = false;
      onRollRef.current(value);
    },
    [disabled, serverRoll],
  );

  const size = 56;

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <button
        onClick={() => handleRoll()}
        disabled={disabled || rolling}
        className="relative cursor-pointer select-none rounded-2xl"
        style={{
          width: 80,
          height: 80,
          opacity: disabled ? 0.6 : 1,
          background: "transparent",
          border: "none",
        }}
        aria-label="Roll dice"
      >
        {/* Contact shadow */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 rounded-full bg-black/40"
          style={{
            width: 50,
            height: 8,
            filter: "blur(3px)",
            transform: `translate(-50%, calc(-50% + 28px)) scale(${rolling ? 1.2 : 1})`,
            opacity: rolling ? 0.5 : 0.3,
          }}
        />
        {/* Idle glow when ready */}
        {!rolling && !disabled && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse"
            style={{ width: 76, height: 76, boxShadow: `0 0 16px 3px ${currentPlayerColor}80` }}
          />
        )}
        {/* The dice face */}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${animClass}`}
        >
          <DiceFace value={displayValue} size={size} />
        </div>
      </button>

      {isExtraRoll && (
        <span className="rounded-full bg-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
          EXTRA ROLL
        </span>
      )}
    </div>
  );
});
