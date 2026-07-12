import { useState, useRef } from "react";
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

// Rotation to show each face on the front
const FACE_ROTATION: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateY(-90deg)",
  3: "rotateX(90deg)",
  4: "rotateX(-90deg)",
  5: "rotateY(90deg)",
  6: "rotateY(180deg)",
};

interface DiceRollProps {
  onRoll: (value: number) => void;
  disabled?: boolean;
  currentPlayerColor?: string;
  isExtraRoll?: boolean;
  serverRoll?: () => Promise<number>;
}

function Face({ value }: { value: number }) {
  const pips = PIPS[value];
  return (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-xl border-2 border-amber-900/20 bg-gradient-to-br from-amber-50 to-amber-100 p-2 shadow-inner">
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const hasPip = pips.some(([r, c]) => r === row && c === col);
        return (
          <div key={i} className="flex items-center justify-center">
            {hasPip && (
              <div
                className="size-2.5 rounded-full bg-gradient-to-br from-stone-700 to-stone-900"
                style={{ boxShadow: "inset 0 1px 1px oklch(0 0 0 / 0.4)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DiceRoll({
  onRoll,
  disabled = false,
  currentPlayerColor = "#d97706",
  isExtraRoll = false,
  serverRoll,
}: DiceRollProps) {
  const [rolling, setRolling] = useState(false);
  const [finalValue, setFinalValue] = useState<number | null>(null);
  const [rotation, setRotation] = useState<string>("rotateX(0deg) rotateY(0deg)");
  const [tumble, setTumble] = useState(false);
  const cubeRef = useRef<HTMLDivElement>(null);

  const handleRoll = async () => {
    if (disabled || rolling) return;
    setRolling(true);
    haptics.roll();
    soundManager.play("dice_roll");

    // Tumble animation: rapid random rotations
    setTumble(true);
    const flipCount = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < flipCount; i++) {
      const rx = Math.floor(Math.random() * 4) * 90 + 360 * (i + 1);
      const ry = Math.floor(Math.random() * 4) * 90 + 360 * (i + 1);
      setRotation(`rotateX(${rx}deg) rotateY(${ry}deg)`);
      await new Promise((r) => setTimeout(r, 110));
    }

    // Final value
    const value = serverRoll ? await serverRoll() : Math.floor(Math.random() * 6) + 1;
    setFinalValue(value);
    // Settle on the correct face with a springy transition
    setRotation(FACE_ROTATION[value]);
    setTumble(false);
    await new Promise((r) => setTimeout(r, 250));
    setRolling(false);
    haptics.tap();
    onRoll(value);
  };

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <button
        onClick={handleRoll}
        disabled={disabled || rolling}
        className="relative cursor-pointer select-none"
        style={{
          width: 64,
          height: 64,
          perspective: 400,
          opacity: disabled ? 0.5 : 1,
        }}
        aria-label="Roll dice"
      >
        {/* Contact shadow under dice (stays flat, doesn't rotate) */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 transition-all"
          style={{
            width: 50,
            height: 14,
            filter: "blur(4px)",
            transform: rolling
              ? "translate(-50%, -50%) scale(1.3) "
              : "translate(-50%, -50%) scale(1)",
          }}
        />
        {/* Glow ring when it's your turn */}
        {!rolling && !disabled && (
          <div
            className="absolute -inset-2 rounded-full animate-pulse"
            style={{ boxShadow: `0 0 20px 4px ${currentPlayerColor}80` }}
          />
        )}
        {/* The 3D cube */}
        <div
          ref={cubeRef}
          className="absolute left-1/2 top-1/2"
          style={{
            width: 48,
            height: 48,
            transformStyle: "preserve-3d",
            transform: `translate(-50%, -50%) ${rotation}`,
            transition: tumble
              ? "transform 0.1s linear"
              : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* 6 faces */}
          <div className="absolute" style={{ width: 48, height: 48, transform: "translateZ(24px)" }}><Face value={1} /></div>
          <div className="absolute" style={{ width: 48, height: 48, transform: "rotateY(90deg) translateZ(24px)" }}><Face value={2} /></div>
          <div className="absolute" style={{ width: 48, height: 48, transform: "rotateX(90deg) translateZ(24px)" }}><Face value={3} /></div>
          <div className="absolute" style={{ width: 48, height: 48, transform: "rotateX(-90deg) translateZ(24px)" }}><Face value={4} /></div>
          <div className="absolute" style={{ width: 48, height: 48, transform: "rotateY(-90deg) translateZ(24px)" }}><Face value={5} /></div>
          <div className="absolute" style={{ width: 48, height: 48, transform: "rotateY(180deg) translateZ(24px)" }}><Face value={6} /></div>
        </div>
      </button>

      {isExtraRoll && (
        <span className="rounded-full bg-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
          🎲 EXTRA ROLL
        </span>
      )}
    </div>
  );
}
