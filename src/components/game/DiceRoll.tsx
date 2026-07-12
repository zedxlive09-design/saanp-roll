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
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-lg border border-amber-900/20 bg-gradient-to-br from-amber-50 to-amber-100 p-1.5 shadow-inner">
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const hasPip = pips.some(([r, c]) => r === row && c === col);
        return (
          <div key={i} className="flex items-center justify-center">
            {hasPip && (
              <div
                className="size-2 rounded-full bg-gradient-to-br from-stone-700 to-stone-900"
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
  const [rotation, setRotation] = useState<string>("rotateX(0deg) rotateY(0deg)");
  const [pos, setPos] = useState({ x: 0, y: 0, scale: 1 });
  const [showGlow, setShowGlow] = useState(false);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  const handleRoll = async () => {
    if (disabled || rolling) return;
    setRolling(true);
    setShowGlow(false);
    haptics.roll();
    soundManager.play("dice_roll");

    // Determine final value
    const value = serverRoll ? await serverRoll() : Math.floor(Math.random() * 6) + 1;

    // Realistic tumble: dice travels across the board in a bouncing arc,
    // spinning rapidly, then settles on the final face.
    // Trajectory: start offset, bounce 3 times, land center.
    const duration = 1100; // ms
    const startTime = performance.now();
    const startX = -120 - Math.random() * 40;
    const startY = -60 + Math.random() * 120;
    const bounces = 3;

    // Pre-generate random spin amounts (full rotations per axis)
    const spinX = (3 + Math.floor(Math.random() * 3)) * 360;
    const spinY = (3 + Math.floor(Math.random() * 3)) * 360;

    const finalRot = FACE_ROTATION[value];

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Position: ease-out horizontal, bounce vertical
      const easeT = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const x = startX * (1 - easeT);
      // Bouncing arc: parabola per bounce segment
      const bouncePhase = (t * bounces) % 1;
      const bounceHeight = 30 * (1 - t * 0.6); // bounce height decreases
      const y = startY * (1 - easeT) - Math.sin(bouncePhase * Math.PI) * bounceHeight;

      // Scale: slightly larger mid-flight, settle to 1
      const scale = 1 + Math.sin(t * Math.PI) * 0.15;

      // Rotation: rapid spin, decelerating, land on final face
      let rot;
      if (t < 0.85) {
        const spinT = t / 0.85;
        const rx = spinX * spinT;
        const ry = spinY * spinT;
        rot = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      } else {
        // Final settle: blend from last spin to final face
        const settleT = (t - 0.85) / 0.15;
        const settleEase = 1 - Math.pow(1 - settleT, 3);
        rot = finalRot;
      }

      setPos({ x, y, scale });
      setRotation(rot);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Landed
        setPos({ x: 0, y: 0, scale: 1 });
        setRotation(finalRot);
        haptics.tap();
        setTimeout(() => {
          setRolling(false);
          setShowGlow(true);
          onRoll(value);
        }, 200);
      }
    }
    animRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <button
        onClick={handleRoll}
        disabled={disabled || rolling}
        className="relative cursor-pointer select-none"
        style={{
          width: 56,
          height: 56,
          perspective: 500,
          opacity: disabled ? 0.4 : 1,
        }}
        aria-label="Roll dice"
      >
        {/* Contact shadow that follows the dice (bounces with it) */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full bg-black/50"
          style={{
            width: 40,
            height: 10,
            filter: "blur(3px)",
            transform: `translate(calc(-50% + ${pos.x * 0.3}px), calc(-50% + 28px)) scale(${pos.scale * (1 - Math.abs(pos.y) / 80)})`,
            opacity: 0.4 + pos.scale * 0.2,
          }}
        />
        {/* Idle glow when ready to roll */}
        {!rolling && !disabled && showGlow && (
          <div
            className="absolute -inset-2 rounded-full animate-pulse"
            style={{ boxShadow: `0 0 16px 3px ${currentPlayerColor}80` }}
          />
        )}
        {/* The 3D cube — travels and tumbles */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: 40,
            height: 40,
            transformStyle: "preserve-3d",
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${pos.scale}) ${rotation}`,
            transition: rolling ? "none" : "transform 0.3s ease",
          }}
        >
          {/* 6 faces */}
          <div className="absolute" style={{ width: 40, height: 40, transform: "translateZ(20px)" }}><Face value={1} /></div>
          <div className="absolute" style={{ width: 40, height: 40, transform: "rotateY(90deg) translateZ(20px)" }}><Face value={2} /></div>
          <div className="absolute" style={{ width: 40, height: 40, transform: "rotateX(90deg) translateZ(20px)" }}><Face value={3} /></div>
          <div className="absolute" style={{ width: 40, height: 40, transform: "rotateX(-90deg) translateZ(20px)" }}><Face value={4} /></div>
          <div className="absolute" style={{ width: 40, height: 40, transform: "rotateY(-90deg) translateZ(20px)" }}><Face value={5} /></div>
          <div className="absolute" style={{ width: 40, height: 40, transform: "rotateY(180deg) translateZ(20px)" }}><Face value={6} /></div>
        </div>
      </button>

      {isExtraRoll && (
        <span className="rounded-full bg-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
          EXTRA ROLL
        </span>
      )}
    </div>
  );
}
