import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Board } from "@/components/game/Board";
import { DiceRoll } from "@/components/game/DiceRoll";
import { useGameRoom } from "@/hooks/use-game-room";
import { useAuth } from "@/hooks/use-auth";
import { BOARD_CONFIGS, getSnakeTail, getLadderTop } from "@/lib/game-engine";
import { soundManager } from "@/lib/sounds";
import {
  ArrowLeft,
  RefreshCw,
  ScrollText,
  Wifi,
  Timer,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const TILE_STEP_DELAY = 60;
const TURN_TIMEOUT_SECONDS = 30;

export default function OnlineGamePlay() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (!roomCode) {
    navigate("/lobby", { replace: true });
    return null;
  }

  return <OnlineGamePlayInner roomCode={roomCode} />;
}

function OnlineGamePlayInner({ roomCode }: { roomCode: string }) {
  const navigate = useNavigate();
  const { game, rollDiceOnline, leaveGame, skipTurn } =
    useGameRoom(roomCode);
  const [isResolving, setIsResolving] = useState(false);
  const [lastRollValue, setLastRollValue] = useState<number | null>(null);
  const [showMoveLog, setShowMoveLog] = useState(false);
  const [highlightedTile, setHighlightedTile] = useState<number | null>(null);
  const [animatedPositions, setAnimatedPositions] = useState<
    Record<string, number>
  >({});
  const [timeLeft, setTimeLeft] = useState(TURN_TIMEOUT_SECONDS);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const skippedRef = useRef<string | null>(null); // prevent duplicate skips

  // Initialize sound on mount, leave on unmount
  useEffect(() => {
    soundManager.init();
    return () => {
      soundManager.stopAll();
      if (animTimeoutRef.current) {
        clearTimeout(animTimeoutRef.current);
        clearInterval(animTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) {
        clearTimeout(animTimeoutRef.current);
        clearInterval(animTimeoutRef.current);
      }
    };
  }, []);

  // --- Turn Timer ---
  useEffect(() => {
    if (!game || game.status !== "playing") return;

    const tick = () => {
      const elapsed = Math.floor(
        (Date.now() - game.turnStartedAt) / 1000,
      );
      const remaining = Math.max(0, TURN_TIMEOUT_SECONDS - elapsed);
      setTimeLeft(remaining);
    };

    // Initial tick
    tick();

    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [game?._id, game?.status, game?.turnStartedAt, game?.currentPlayerIndex]);

  // Auto-skip when timer hits 0
  useEffect(() => {
    if (!game || game.status !== "playing" || timeLeft > 0) return;

    // Create a unique key for this turn to prevent double-skips
    const turnKey = `${game.currentPlayerIndex}-${game.turnStartedAt}`;
    if (skippedRef.current === turnKey) return;
    skippedRef.current = turnKey;

    const doSkip = async () => {
      try {
        await skipTurn({ gameId: game._id as any });
        soundManager.play("overshoot");
        toast.info("Turn skipped — timed out", {
          duration: 2000,
        });
      } catch (err) {
        // Ignore skip errors (might have been skipped already)
      }
    };
    doSkip();
  }, [timeLeft, game, skipTurn]);

  if (!game) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center space-y-3">
          <div className="animate-pulse text-4xl">🎲</div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </motion.div>
    );
  }

  if (game.status === "waiting") {
    navigate(`/lobby`, { replace: true });
    return null;
  }

  const boardMode = game.boardId as "classic" | "venom";
  const isGameOver = game.status === "finished";
  const winner = game.players.find((p) => p.userId === game.winnerId);
  const currentPlayer = game.players[game.currentPlayerIndex];
  const isExtraRoll = game.turnPhase === "extra_roll";
  const currentPlayerDisconnected = currentPlayer && !currentPlayer.isConnected;
  const timerUrgent = timeLeft <= 10;
  const timerCritical = timeLeft <= 5;

  // Timer display value
  const timerPercent = (timeLeft / TURN_TIMEOUT_SECONDS) * 100;

  // Derive display positions with animation support
  const displayPlayers = game.players.map((p) => ({
    id: p.userId,
    name: p.name,
    color: p.color,
    position:
      animatedPositions[p.userId] !== undefined
        ? animatedPositions[p.userId]
        : p.position,
    consecutiveSixes: p.consecutiveSixes,
  }));

  const handleRoll = useCallback(
    async (roll: number) => {
      if (isResolving || isGameOver) return;
      setIsResolving(true);
      setLastRollValue(roll);

      const player = game.players[game.currentPlayerIndex];
      const rawNewPos = player.position + roll;
      const didOvershoot = rawNewPos > 100;

      const landingTile = didOvershoot
        ? player.position
        : Math.min(rawNewPos, 100);
      const fromPos = player.position;
      const tilesToStep = landingTile - fromPos;

      // Sound effects
      if (didOvershoot) {
        soundManager.play("overshoot");
      }

      if (!didOvershoot && rawNewPos <= 100 && tilesToStep > 0) {
        const snakeTail = getSnakeTail(boardMode, rawNewPos);
        const ladderTop = getLadderTop(boardMode, rawNewPos);
        if (snakeTail) {
          setTimeout(
            () => soundManager.play("snake_bite"),
            tilesToStep * TILE_STEP_DELAY + 200,
          );
        } else if (ladderTop) {
          setTimeout(
            () => soundManager.play("ladder_climb"),
            tilesToStep * TILE_STEP_DELAY + 200,
          );
        }
      }

      if (game.status === "finished") {
        setTimeout(() => soundManager.play("win_fanfare"), 800);
      }

      if (!didOvershoot && landingTile <= 100) {
        setHighlightedTile(landingTile);
        setTimeout(() => setHighlightedTile(null), 1200);
      }

      if (tilesToStep > 0 && !didOvershoot) {
        let step = 1;
        const stepInterval = setInterval(() => {
          const steppedPos = fromPos + step;
          setAnimatedPositions((prev) => ({
            ...prev,
            [player.userId]: steppedPos,
          }));
          soundManager.play("tile_step");
          step++;

          if (steppedPos >= landingTile) {
            clearInterval(stepInterval);

            const finalizeTimeout = setTimeout(() => {
              setHighlightedTile(null);
              setIsResolving(false);
              setAnimatedPositions({});
            }, 500);
            animTimeoutRef.current = finalizeTimeout;
          }
        }, TILE_STEP_DELAY);
        animTimeoutRef.current = stepInterval;
      } else {
        const timeout = setTimeout(() => {
          setIsResolving(false);
        }, 500);
        animTimeoutRef.current = timeout;
      }
    },
    [game, isResolving, isGameOver, boardMode],
  );

  // Server roll handler for DiceRoll
  const handleServerRoll = useCallback(async () => {
    if (!game?._id) return 0;
    try {
      const result = await rollDiceOnline({ gameId: game._id as any });
      return result.roll;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to roll dice",
      );
      throw err;
    }
  }, [game?._id, rollDiceOnline]);

  const handleLeave = async () => {
    if (game?._id) {
      await leaveGame({ gameId: game._id as any });
    }
    navigate("/home");
  };

  const handleRematch = () => {
    navigate("/lobby");
  };

  // Auto-scroll move log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [game.moveLog.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-background to-secondary/20"
    >
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleLeave}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                {BOARD_CONFIGS[boardMode].name}
              </h1>
              <div className="flex items-center gap-1.5">
                <Wifi className="h-3 w-3 text-emerald-500" />
                <p className="text-[11px] text-muted-foreground">
                  Online · Turn{" "}
                  {game.moveLog.length > 0
                    ? Math.ceil(game.moveLog.length / game.players.length)
                    : 1}
                </p>
              </div>
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
              <Button variant="outline" size="sm" onClick={handleRematch}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Rematch
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
              className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 p-6 text-center shadow-lg"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="text-5xl mb-3"
              >
                🏆
              </motion.div>
              <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                {winner.name} Wins!
              </h2>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                Reached tile 100 in {game.moveLog.length} moves
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button variant="default" onClick={handleRematch}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
                <Button variant="outline" onClick={() => navigate("/home")}>
                  Home
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Board */}
        <div className="flex justify-center">
          <Board
            boardId={boardMode}
            players={displayPlayers}
            highlightedTile={highlightedTile}
            className="max-w-[420px] w-full"
          />
        </div>

        {/* Player indicator & dice */}
        {!isGameOver && (
          <div className="space-y-4">
            <motion.div
              key={currentPlayer?.userId + game.turnPhase}
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
                  <p className="font-semibold text-sm flex items-center gap-2">
                    {currentPlayer?.name}'s Turn
                    {isExtraRoll && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-amber-100 text-amber-700"
                      >
                        Extra Roll
                      </Badge>
                    )}
                    {/* Turn Timer */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium ${
                        timerCritical
                          ? "text-red-600 dark:text-red-400"
                          : timerUrgent
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      <Clock
                        className={`h-3 w-3 ${
                          timerCritical ? "animate-pulse" : ""
                        }`}
                      />
                      {timeLeft}s
                    </span>
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
              <div className="flex flex-col items-end gap-1">
                <p className="text-2xl font-bold font-mono">
                  {currentPlayer?.position || 0}
                </p>
                <p className="text-[10px] text-muted-foreground">/ 100</p>
                {/* Timer progress bar */}
                <div className="w-16 h-1 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      timerCritical
                        ? "bg-red-500"
                        : timerUrgent
                          ? "bg-amber-500"
                          : "bg-indigo-400"
                    }`}
                    animate={{ width: `${timerPercent}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            </motion.div>

            <div className="flex flex-col items-center py-2">
              {/* Timer warning banner */}
              {currentPlayerDisconnected && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-2 text-xs text-red-700 dark:text-red-400"
                >
                  <Timer className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {currentPlayer.name} disconnected — auto-skipping in{" "}
                    <span className="font-mono font-bold">{timeLeft}s</span>
                  </span>
                </motion.div>
              )}

              <DiceRoll
                onRoll={handleRoll}
                serverRoll={handleServerRoll}
                disabled={isResolving || isGameOver || currentPlayerDisconnected}
                currentPlayerColor={currentPlayer?.color}
                isExtraRoll={isExtraRoll}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {isResolving
                  ? "Moving piece..."
                  : currentPlayerDisconnected
                    ? "Waiting for auto-skip..."
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
            const dbPlayer = game.players[idx];
            const isCurrent =
              idx === game.currentPlayerIndex && !isGameOver;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                  isCurrent ? "border-l-4 bg-accent/50" : "border-border"
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
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    {player.name}
                    {!dbPlayer?.isConnected && (
                      <span className="text-[11px] text-muted-foreground italic">
                        (disconnected)
                      </span>
                    )}
                    {winner?.userId === player.id && (
                      <span className="ml-0.5">👑</span>
                    )}
                    {/* Timer badge for current player */}
                    {isCurrent && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-mono ${
                          timerCritical
                            ? "text-red-500"
                            : timerUrgent
                              ? "text-amber-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        <Clock
                          className={`h-2.5 w-2.5 ${
                            timerCritical ? "animate-pulse" : ""
                          }`}
                        />
                        {timeLeft}s
                      </span>
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

        {/* Move log */}
        {showMoveLog && game.moveLog.length > 0 && (
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
              {game.moveLog.map((log, i) => (
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
  );
}
