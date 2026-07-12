import { useState, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { soundManager } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

const FACE_ROTATION: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateY(-90deg)",
  3: "rotateX(90deg)",
  4: "rotateX(-90deg)",
  5: "rotateY(90deg)",
  6: "rotateY(180deg)",
};

const CUBE_SIZE = 56;
const HALF = CUBE_SIZE / 2;

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

function Face({ value }: { value: number }) {
  const pips = PIPS[value];
  return (
    <div
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-lg border-2 border-amber-900/30 bg-amber-50 p-1.5 shadow-inner"
      style={{ width: CUBE_SIZE, height: CUBE_SIZE }}
    >
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

export const DiceRoll = forwardRef<DiceRollHandle, DiceRollProps>(function DiceRoll(
  { onRoll, disabled = false, currentPlayerColor = "#d97706", isExtraRoll = false, serverRoll },
  ref,
) {
  const [rolling, setRolling] = useState(false);
  const [transform, setTransform] = useState<string>(
    `translate(-50%, -50%) ${FACE_ROTATION[1]}`,
  );
  const [shadowScale, setShadowScale] = useState(1);
  const [showGlow, setShowGlow] = useState(true);
  const rollingRef = useRef(false);
  const animRef = useRef<number | null>(null);
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
      setShowGlow(false);
      haptics.roll();
      soundManager.play("dice_roll");

      const value = serverRoll ? await serverRoll() : Math.floor(Math.random() * 6) + 1;

      // Throw from a random edge, tumble across, settle near center
      const fromLeft = Math.random() > 0.5;
      const startX = fromLeft ? -140 : 140;
      const startY = -30 + Math.random() * 80;
      const landX = -20 + Math.random() * 40;
      const landY = -15 + Math.random() * 40;

      const duration = 900;
      const startTime = performance.now();
      const bounces = 3;
      const spinX = (3 + Math.floor(Math.random() * 3)) * 360;
      const spinY = (3 + Math.floor(Math.random() * 3)) * 360;
      const finalRot = FACE_ROTATION[value];

      function animate(now: number) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Position: ease-out from edge to landing spot
        const easeT = 1 - Math.pow(1 - t, 2.5);
        const x = startX + (landX - startX) * easeT;
        const baseY = startY + (landY - startY) * easeT;
        // Bouncing arc
        const bouncePhase = (t * bounces) % 1;
        const bounceHeight = 35 * (1 - t * 0.7);
        const y = baseY - Math.sin(bouncePhase * Math.PI) * bounceHeight;

        // Scale: slightly larger mid-flight
        const scale = 1 + Math.sin(t * Math.PI) * 0.15;

        // Rotation: rapid spin decelerating, land on final face
        let rot;
        if (t < 0.82) {
          const spinT = t / 0.82;
          const decel = 1 - Math.pow(1 - spinT, 2);
          rot = `rotateX(${spinX * decel}deg) rotateY(${spinY * decel}deg)`;
        } else {
          rot = finalRot;
        }

        // Update BOTH position AND rotation every frame
        setTransform(
          `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale}) ${rot}`,
        );
        setShadowScale(scale * (1 - Math.abs(y) / 100));

        if (t < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          // Landed
          setTransform(
            `translate(calc(-50% + ${landX}px), calc(-50% + ${landY}px)) scale(1) ${finalRot}`,
          );
          setShadowScale(1);
          haptics.tap();
          setTimeout(() => {
            setRolling(false);
            setShowGlow(true);
            rollingRef.current = false;
            onRollRef.current(value);
          }, 200);
        }
      }

      // Start immediately — no delay
      animRef.current = requestAnimationFrame(animate);
    },
    [disabled, serverRoll],
  );

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <button
        onClick={() => handleRoll()}
        disabled={disabled || rolling}
        className="relative cursor-pointer select-none"
        style={{
          width: 120,
          height: 120,
          perspective: 600,
          opacity: disabled ? 0.85 : 1,
          background: "transparent",
          border: "none",
        }}
        aria-label="Roll dice"
      >
        {/* Contact shadow */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full bg-black/50"
          style={{
            width: 45,
            height: 10,
            filter: "blur(4px)",
            transform: `translate(-50%, calc(-50% + 25px)) scale(${shadowScale})`,
            opacity: 0.3 + shadowScale * 0.2,
          }}
        />
        {/* Idle glow when ready */}
        {!rolling && !disabled && showGlow && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse"
            style={{ width: 90, height: 90, boxShadow: `0 0 20px 4px ${currentPlayerColor}80` }}
          />
        )}
        {/* The 3D cube */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: CUBE_SIZE,
            height: CUBE_SIZE,
            transformStyle: "preserve-3d",
            transform: transform,
            transition: rolling ? "none" : "transform 0.3s ease",
          }}
        >
          <div className="absolute" style={{ transform: `translateZ(${HALF}px)` }}><Face value={1} /></div>
          <div className="absolute" style={{ transform: `rotateY(90deg) translateZ(${HALF}px)` }}><Face value={2} /></div>
          <div className="absolute" style={{ transform: `rotateX(90deg) translateZ(${HALF}px)` }}><Face value={3} /></div>
          <div className="absolute" style={{ transform: `rotateX(-90deg) translateZ(${HALF}px)` }}><Face value={4} /></div>
          <div className="absolute" style={{ transform: `rotateY(-90deg) translateZ(${HALF}px)` }}><Face value={5} /></div>
          <div className="absolute" style={{ transform: `rotateY(180deg) translateZ(${HALF}px)` }}><Face value={6} /></div>
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
