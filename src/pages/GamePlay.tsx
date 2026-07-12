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
          setTimeout(() => soundManager.play("snake_bite"), tilesToStep * TILE_STEP_DELAY + 200);
        } else if (ladderTop) {
          setTimeout(() => soundManager.play("ladder_climb"), tilesToStep * TILE_STEP_DELAY + 200);
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
          soundManager.play("tile_step");
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

  // Auto-scroll move log when new entries are added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gameState.moveLog.length]);

  return (
    <>
    <LandscapePrompt />
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-background to-secondary/20"
    >
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-base font-bold tracking-tight">
                {BOARD_CONFIGS[boardMode].name}
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Turn{" "}
                {gameState.moveLog.length > 0
                  ? Math.ceil(
                      gameState.moveLog.length / gameState.players.length,
                    )
                  : 1}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowMoveLog(!showMoveLog)}
              className={showMoveLog ? "bg-accent" : ""}
            >
              <ScrollText className="h-4 w-4" />
            </Button>
            {isGameOver && (
              <Button variant="outline" size="sm" onClick={handleNewGame}>
                <RefreshCw className="mr-1 h-3 w-3" />
                New
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        {/* Game Over Banner */}
        <AnimatePresence>
          {isGameOver && winner && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/10 via-primary/5 to-card p-6 text-center shadow-paper-lg"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="text-5xl mb-3"
              >
                🏆
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-primary">
                {winner.name} Wins!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Reached tile 100 in {gameState.moveLog.length} moves
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button
                  variant="default"
                  onClick={handleRematch}
                  className="bg-primary hover:bg-primary/90"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rematch
                </Button>
                <Button variant="outline" onClick={handleNewGame}>
                  New Game Setup
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Board with display players (may have animated positions) */}
        <div className="flex justify-center">
          <Board
            boardId={boardMode}
            players={displayPlayers}
            highlightedTile={highlightedTile}
            className="max-w-[420px] w-full"
          />
        </div>

        {/* Player indicator & dice area */}
        {!isGameOver && (
          <div className="space-y-4">
            <motion.div
              key={currentPlayer?.id + gameState.turnPhase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm"
                  style={{ backgroundColor: currentPlayer?.color }}
                >
                  {currentPlayer?.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {currentPlayer?.name}'s Turn
                    {isExtraRoll && (
                      <Badge
                        variant="secondary"
                        className="ml-2 text-[10px] bg-primary/15 text-primary"
                      >
                        Extra Roll
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Position: {currentPlayer?.position || 0}
                    {lastRollValue !== null && (
                      <span className="ml-2">
                        · Last roll:{" "}
                        <span className="font-mono font-bold">
                          {lastRollValue}
                        </span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-mono">
                  {currentPlayer?.position || 0}
                </p>
                <p className="text-[10px] text-muted-foreground">/ 100</p>
              </div>
            </motion.div>

            <div className="flex flex-col items-center py-2">
              <DiceRoll
                onRoll={handleRoll}
                disabled={isResolving || isGameOver}
                currentPlayerColor={currentPlayer?.color}
                isExtraRoll={isExtraRoll}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {isResolving
                  ? animatingPlayer
                    ? "Moving piece..."
                    : "Resolving..."
                  : "Tap the dice to roll"}
              </p>
            </div>
          </div>
        )}

        {/* Players progress */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            All Players
          </p>
          {displayPlayers.map((player, idx) => {
            const isCurrent =
              idx === gameState.currentPlayerIndex && !isGameOver;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                  isCurrent
                    ? "border-l-4 bg-accent/50"
                    : "border-border"
                }`}
                style={{
                  borderLeftColor: isCurrent ? player.color : undefined,
                }}
              >
                <div
                  className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: player.color }}
                >
                  {player.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {player.name}
                    {winner?.id === player.id && (
                      <span className="ml-1.5">👑</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold font-mono">
                    {player.position}
                  </span>
                  <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: player.color,
                        width: `${(player.position / 100) * 100}%`,
                      }}
                      layout
                      transition={{ type: "spring", stiffness: 100 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Move log (collapsible) */}
        {showMoveLog && gameState.moveLog.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border bg-card p-4 max-h-48 overflow-y-auto"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Move Log
            </p>
            <div className="space-y-1">
              {gameState.moveLog.map((log, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  <span className="text-muted-foreground/50">#{i + 1}</span>{" "}
                  {log}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>
          </motion.div>
        )}
      </main>
    </motion.div>
    </>
  );
}
