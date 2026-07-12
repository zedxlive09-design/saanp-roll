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
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-lg border-2 border-amber-900/30 bg-amber-50 p-1.5 shadow-inner">
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
  const [rotation, setRotation] = useState<string>("rotateX(0deg) rotateY(0deg)");
  const [pos, setPos] = useState({ x: 0, y: 0, scale: 1, opacity: 1 });
  const [showGlow, setShowGlow] = useState(true);
  const [idlePos, setIdlePos] = useState({ x: 0, y: 0 });
  const rollingRef = useRef(false);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

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

      // Real-life throw: dice starts OFF-BOARD from a random edge (left or right),
      // tumbles across the board with bouncing arcs, and settles at a random
      // landing spot near center.
      const fromLeft = Math.random() > 0.5;
      const startX = fromLeft ? -180 - Math.random() * 60 : 180 + Math.random() * 60;
      const startY = -40 + Math.random() * 120;
      // Landing spot: somewhere near center but not exactly center
      const landX = -30 + Math.random() * 60;
      const landY = -20 + Math.random() * 50;

      const duration = 1200;
      const startTime = performance.now();
      const bounces = 3;
      const spinX = (4 + Math.floor(Math.random() * 3)) * 360;
      const spinY = (4 + Math.floor(Math.random() * 3)) * 360;
      const finalRot = FACE_ROTATION[value];

      function animate(now: number) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Position: ease-out from edge to landing spot
        const easeT = 1 - Math.pow(1 - t, 2.5);
        const x = startX + (landX - startX) * easeT;
        const baseY = startY + (landY - startY) * easeT;
        // Bouncing arc on top of the path
        const bouncePhase = (t * bounces) % 1;
        const bounceHeight = 40 * (1 - t * 0.7);
        const y = baseY - Math.sin(bouncePhase * Math.PI) * bounceHeight;

        // Scale: slightly larger mid-flight, settle to 1
        const scale = 1 + Math.sin(t * Math.PI) * 0.2;

        // Rotation: rapid spin, decelerating, land on final face
        let rot;
        if (t < 0.85) {
          const spinT = t / 0.85;
          const decel = 1 - Math.pow(1 - spinT, 2);
          rot = `rotateX(${spinX * decel}deg) rotateY(${spinY * decel}deg)`;
        } else {
          rot = finalRot;
        }

        setPos({ x, y, scale, opacity: 1 });

        if (t < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          // Landed — store the landing position as the new idle position
          setPos({ x: landX, y: landY, scale: 1, opacity: 1 });
          setIdlePos({ x: landX, y: landY });
          setRotation(finalRot);
          haptics.tap();
          setTimeout(() => {
            setRolling(false);
            setShowGlow(true);
            onRoll(value);
          }, 250);
        }
      }

      // Start the dice invisible at the edge, then begin
      setPos({ x: startX, y: startY, scale: 0.8, opacity: 0 });
      setTimeout(() => {
        setPos({ x: startX, y: startY, scale: 0.8, opacity: 1 });
        animRef.current = requestAnimationFrame(animate);
      }, 50);
    },
    [disabled, serverRoll, onRoll],
  );

  const currentPos = rolling ? pos : { x: idlePos.x, y: idlePos.y, scale: 1, opacity: 1 };

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
          opacity: disabled ? 0.7 : 1,
          background: "transparent",
          border: "none",
        }}
        aria-label="Roll dice"
      >
        {/* Contact shadow that follows the dice */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full bg-black/50"
          style={{
            width: 50,
            height: 12,
            filter: "blur(4px)",
            transform: `translate(calc(-50% + ${currentPos.x * 0.3}px), calc(-50% + 30px)) scale(${currentPos.scale * (1 - Math.abs(currentPos.y) / 100)})`,
            opacity: 0.3 + currentPos.scale * 0.2,
          }}
        />
        {/* Idle glow when ready to roll */}
        {!rolling && !disabled && showGlow && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse"
            style={{ width: 100, height: 100, boxShadow: `0 0 24px 6px ${currentPlayerColor}80` }}
          />
        )}
        {/* The 3D cube — throws from edge, tumbles across, settles */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: 44,
            height: 44,
            transformStyle: "preserve-3d",
            transform: `translate(calc(-50% + ${currentPos.x}px), calc(-50% + ${currentPos.y}px)) scale(${currentPos.scale}) ${rotation}`,
            opacity: currentPos.opacity,
            transition: rolling ? "none" : "transform 0.3s ease, opacity 0.2s ease",
          }}
        >
          <div className="absolute" style={{ width: 44, height: 44, transform: "translateZ(30px)" }}><Face value={1} /></div>
          <div className="absolute" style={{ width: 60, height: 60, transform: "rotateY(90deg) translateZ(30px)" }}><Face value={2} /></div>
          <div className="absolute" style={{ width: 60, height: 60, transform: "rotateX(90deg) translateZ(30px)" }}><Face value={3} /></div>
          <div className="absolute" style={{ width: 60, height: 60, transform: "rotateX(-90deg) translateZ(30px)" }}><Face value={4} /></div>
          <div className="absolute" style={{ width: 60, height: 60, transform: "rotateY(-90deg) translateZ(30px)" }}><Face value={5} /></div>
          <div className="absolute" style={{ width: 60, height: 60, transform: "rotateY(180deg) translateZ(30px)" }}><Face value={6} /></div>
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
