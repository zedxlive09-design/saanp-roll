import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Board } from "@/components/game/Board";
import { DiceRoll } from "@/components/game/DiceRoll";
import {
  createInitialGameState,
  applyRoll,
  advanceTurn,
  BOARD_CONFIGS,
  getSnakeTail,
  getLadderTop,
} from "@/lib/game-engine";
import type { BoardMode, GameState } from "@/lib/game-engine";
import { soundManager } from "@/lib/sounds";
import { ArrowLeft, RefreshCw, ScrollText } from "lucide-react";
import { LandscapePrompt } from "@/components/game/LandscapePrompt";
import { useDeviceSpec } from "@/hooks/use-device-spec";
import { haptics } from "@/lib/haptics";

interface LocationState {
  boardMode: BoardMode;
  players: Array<{ id: string; name: string; color: string }>;
}

export default function GamePlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  if (!state) {
    navigate("/game/setup", { replace: true });
    return null;
  }

  return <GamePlayInner {...state} />;
}

const TILE_STEP_DELAY = 60; // ms between each tile step during animation

function GamePlayInner({
  boardMode,
  players: playerSetup,
}: LocationState) {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState(boardMode, playerSetup),
  );
  const [lastRollValue, setLastRollValue] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [showMoveLog, setShowMoveLog] = useState(false);
  const [highlightedTile, setHighlightedTile] = useState<number | null>(null);
  // For tile-by-tile animation: store the in-flight intermediate positions
  const [animatingPlayer, setAnimatingPlayer] = useState<{
    playerIndex: number;
    from: number;
    to: number;
    currentStep: number;
  } | null>(null);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isGameOver = gameState.status === "game_over";
  const winner = gameState.players.find((p) => p.id === gameState.winnerId);
  const isExtraRoll = gameState.turnPhase === "extra_roll";

  // Update the animated tile position as we step through
  const [animatedPositions, setAnimatedPositions] = useState<
    Record<string, number>
  >({});

  // Initialize sound manager on first render and clean up on unmount
  useEffect(() => {
    soundManager.init();
    return () => {
      soundManager.stopAll();
    };
  }, []);

  // Cleanup running timeouts/intervals on unmount
  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) {
        clearTimeout(animTimeoutRef.current);
        clearInterval(animTimeoutRef.current);
      }
    };
  }, []);

  const handleRoll = useCallback(
    (roll: number) => {
      if (isResolving || isGameOver) return;
      haptics.roll();
      setIsResolving(true);
      setLastRollValue(roll);

      const afterRoll = applyRoll(gameState, roll);
      const player = gameState.players[gameState.currentPlayerIndex];
      const rawNewPos = player.position + roll;
      const didOvershoot = rawNewPos > 100;
      // The actual final position from the engine (accounts for snakes/ladders)
      const finalPos = afterRoll.players[gameState.currentPlayerIndex].position;
      // The landing tile before snake/ladder resolution
      const landingTile = didOvershoot ? player.position : Math.min(rawNewPos, 100);

      // Animate stepping tile-by-tile from current position to landing tile
      const fromPos = player.position;
      const tilesToStep = landingTile - fromPos;

      // Play overshoot sound if applicable
      if (didOvershoot) {
        soundManager.play("overshoot");
      }

      // Schedule snake/ladder sound effects aligned with animation timing
      if (!didOvershoot && rawNewPos <= 100 && tilesToStep > 0) {
        const snakeTail = getSnakeTail(boardMode, rawNewPos);
        const ladderTop = getLadderTop(boardMode, rawNewPos);
        if (snakeTail) {
          setTimeout(() => { soundManager.play("snake_slither"); soundManager.play("snake_bite"); }, tilesToStep * TILE_STEP_DELAY + 200);
        } else if (ladderTop) {
          setTimeout(() => soundManager.play("ladder_run"), tilesToStep * TILE_STEP_DELAY + 200);
        }
      }

      // Play win fanfare if game is over
      if (afterRoll.status === "game_over") {
        setTimeout(() => soundManager.play("win_fanfare"), 800);
      }

      // Highlight the landing tile
      if (!didOvershoot && landingTile <= 100) {
        setHighlightedTile(landingTile);
        setTimeout(() => setHighlightedTile(null), 1200);
      }

      if (tilesToStep > 0 && !didOvershoot) {
        setAnimatingPlayer({
          playerIndex: gameState.currentPlayerIndex,
          from: fromPos,
          to: landingTile,
          currentStep: fromPos,
        });

        let step = 1;
        const stepInterval = setInterval(() => {
          const steppedPos = fromPos + step;
          setAnimatedPositions((prev) => ({
            ...prev,
            [player.id]: steppedPos,
          }));
          // Play a soft tick for each tile stepped
          soundManager.play("footstep");
          step++;

          if (steppedPos >= landingTile) {
            clearInterval(stepInterval);

            // After stepping animation completes, apply final state after delay for snake/ladder highlight
            const finalizeTimeout = setTimeout(() => {
              // If snake or ladder, show final position
              if (finalPos !== landingTile) {
                setAnimatedPositions((prev) => ({
                  ...prev,
                  [player.id]: finalPos,
                }));
                setHighlightedTile(finalPos);
                // Clear the snake/ladder highlight after a moment
                setTimeout(() => setHighlightedTile(null), 800);
              }

              // Finalize the turn
              const resolveTimeout = setTimeout(() => {
                setAnimatingPlayer(null);
                if (afterRoll.status === "game_over") {
                  setGameState(afterRoll);
                } else if (afterRoll.turnPhase === "extra_roll") {
                  setGameState(afterRoll);
                } else {
                  setGameState(advanceTurn(afterRoll));
                }
                setIsResolving(false);
                setAnimatedPositions({});
              }, finalPos !== landingTile ? 500 : 0);
              animTimeoutRef.current = resolveTimeout;
            }, 500);
            animTimeoutRef.current = finalizeTimeout;
          }
        }, TILE_STEP_DELAY);
        animTimeoutRef.current = stepInterval;
      } else {
        // Overshoot or zero-step — just apply immediately after a brief pause
        const resolveTimeout = setTimeout(() => {
          if (afterRoll.status === "game_over") {
            setGameState(afterRoll);
          } else if (afterRoll.turnPhase === "extra_roll") {
            setGameState(afterRoll);
          } else {
            setGameState(advanceTurn(afterRoll));
          }
          setIsResolving(false);
        }, 500);
        animTimeoutRef.current = resolveTimeout;
      }
    },
    [gameState, isResolving, isGameOver],
  );

  const handleRematch = () => {
    setGameState(createInitialGameState(boardMode, playerSetup));
    setLastRollValue(null);
    setIsResolving(false);
    setHighlightedTile(null);
    setAnimatingPlayer(null);
    setAnimatedPositions({});
  };

  const handleNewGame = () => {
    navigate("/game/setup");
  };

  // Derive display positions: use animated positions during a move, otherwise game state
  const displayPlayers = gameState.players.map((p) => {
    const animPos = animatedPositions[p.id];
    return {
      ...p,
      position: animPos !== undefined ? animPos : p.position,
    };
  });

  const { quality, isMobile, reducedMotion } = useDeviceSpec();
  const isHighSpec = quality === "high";

  // Auto-scroll move log when new entries are added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gameState.moveLog.length]);

  // Board stays FLAT for razor-sharp clarity (CSS 3D tilt blurs SVG).
  // Depth comes from the SVG drop-shadows + felt table background.
  const tilt = 0;

  return (
    <>
      <LandscapePrompt />
      <div
        className="fixed inset-0 overflow-hidden"
        style={{
          // Full-bleed felt table — radial gradient (no blur = cheap on low-spec)
          background:
            boardMode === "venom"
              ? "radial-gradient(ellipse at 50% 35%, oklch(0.26 0.04 200) 0%, oklch(0.16 0.03 200) 70%, oklch(0.12 0.02 200) 100%)"
              : "radial-gradient(ellipse at 50% 35%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
        }}
      >
        {/* Warm spotlight overlay (static gradient, no filter) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, oklch(1 0.02 80 / 0.12) 0%, transparent 55%)",
          }}
        />
        {/* Vignette for depth (static) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: "inset 0 0 220px 60px oklch(0 0 0 / 0.45)",
          }}
        />

        {/* === Top HUD: player chips === */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between gap-2 p-3 safe-top">
          {/* Back + mode */}
          <button
            onClick={() => navigate("/home")}
            className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/40"
            aria-label="Leave game"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Player chips row */}
          <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
            {displayPlayers.map((player, idx) => {
              const isCurrent = idx === gameState.currentPlayerIndex && !isGameOver;
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-md transition-all"
                  style={{
                    backgroundColor: isCurrent
                      ? `${player.color}30`
                      : "oklch(0 0 0 / 0.35)",
                    borderColor: isCurrent ? player.color : "oklch(1 0 0 / 0.12)",
                    transform: isCurrent ? "scale(1.06)" : "scale(1)",
                  }}
                >
                  <span
                    className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[11px] font-semibold text-white/90">
                    {player.position}
                  </span>
                  {winner?.id === player.id && <span className="text-xs">👑</span>}
                </div>
              );
            })}
          </div>

          {/* Move log toggle */}
          <button
            onClick={() => setShowMoveLog(!showMoveLog)}
            className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/40"
            aria-label="Toggle move log"
          >
            <ScrollText className="size-5" />
          </button>
        </div>

        {/* === Center: the board (flat, crisp, fits entirely on screen) === */}
        <div className="absolute inset-0 flex items-center justify-center px-2" style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
          <div
            className="relative aspect-square"
            style={{
              height: "min(calc(100vh - 8rem), 94vw)",
              maxHeight: "calc(100vh - 8rem)",
              maxWidth: "94vw",
              filter: "drop-shadow(0 16px 28px oklch(0 0 0 / 0.55))",
            }}
          >
            <Board
              boardId={boardMode}
              players={displayPlayers}
              highlightedTile={highlightedTile}
              className="h-full w-full"
            />

            {/* Dice overlay — tumbles ON the board surface */}
            {!isGameOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <DiceRoll
                  onRoll={handleRoll}
                  disabled={isResolving || isGameOver}
                  currentPlayerColor={currentPlayer?.color}
                  isExtraRoll={isExtraRoll}
                />
              </div>
            )}
          </div>
        </div>

        {/* === Bottom HUD: turn indicator only (dice is on the board) === */}
        {!isGameOver && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 p-4 safe-bottom">
            <motion.div
              key={currentPlayer?.id + gameState.turnPhase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 rounded-full border border-white/20 bg-black/50 px-4 py-1.5 backdrop-blur-md"
            >
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: currentPlayer?.color }}
              />
              <span className="text-sm font-semibold text-white/90">
                {currentPlayer?.name}'s turn
              </span>
              {isExtraRoll && (
                <span className="rounded-full bg-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  EXTRA ROLL
                </span>
              )}
              {isResolving && (
                <span className="text-[11px] text-white/60">
                  {animatingPlayer ? "Moving…" : "Resolving…"}
                </span>
              )}
            </motion.div>
            {!isResolving && (
              <p className="text-[11px] text-white/60">Tap the dice to roll</p>
            )}
          </div>
        )}

        {/* === Game Over overlay === */}
        <AnimatePresence>
          {isGameOver && winner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="mx-6 w-full max-w-sm rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-8 text-center shadow-paper-lg"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mb-3 text-6xl"
                >
                  🏆
                </motion.div>
                <h2 className="font-display text-3xl font-bold text-primary">
                  {winner.name} Wins!
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Reached tile 100 in {gameState.moveLog.length} moves
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <Button
                    onClick={handleRematch}
                    className="bg-primary text-base hover:bg-primary/90"
                    size="lg"
                  >
                    <RefreshCw className="mr-2 size-4" />
                    Rematch
                  </Button>
                  <Button variant="outline" onClick={handleNewGame} size="lg">
                    New Game Setup
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === Move log slide-in drawer === */}
        <AnimatePresence>
          {showMoveLog && gameState.moveLog.length > 0 && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="absolute right-0 top-0 bottom-0 z-30 w-72 max-w-[80vw] border-l border-white/10 bg-black/70 backdrop-blur-lg safe-top safe-bottom"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <p className="font-display text-sm font-bold text-white/90">
                  Move Log
                </p>
                <button
                  onClick={() => setShowMoveLog(false)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[calc(100%-4rem)] overflow-y-auto p-4 scrollbar-thin">
                <div className="space-y-1.5">
                  {gameState.moveLog.map((log, i) => (
                    <p key={i} className="text-xs leading-relaxed text-white/70">
                      <span className="text-white/40">#{i + 1}</span> {log}
                    </p>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
