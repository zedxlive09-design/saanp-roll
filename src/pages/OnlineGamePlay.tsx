import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Board } from "@/components/game/Board";
import { DiceRoll } from "@/components/game/DiceRoll";
import { useGameRoom, useAnonId } from "@/hooks/use-game-room";
import { useAuth } from "@/hooks/use-auth";
import { BOARD_CONFIGS, getSnakeTail, getLadderTop } from "@/lib/game-engine";
import { soundManager } from "@/lib/sounds";
import {
  AlertTriangle,
  Clock,
  Cpu,
  Crown,
  Dices,
  Hash,
  Loader2,
  LogOut,
  RefreshCw,
  ScrollText,
  Timer,
  Trophy,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { LandscapePrompt } from "@/components/game/LandscapePrompt";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Online multiplayer gameplay — full-bleed felt-green table (venom variant
 * for venom mode) matching local GamePlay.tsx. Floating translucent HUD:
 * player chips + room-code badge up top, turn indicator + connection status +
 * turn timer down below. Board rendered via shared Board component with
 * DiceRoll overlay (using serverRoll prop). All online logic preserved:
 * useGameRoom, useParams(roomCode), rollDiceOnline, leaveGame, skipTurn,
 * turn timer, reconnect detection, serverRoll on DiceRoll.
 */
const TILE_STEP_DELAY = 60;
const TURN_TIMEOUT_SECONDS = 30;

export default function OnlineGamePlay() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (!roomCode) {
    // Missing roomCode param — redirect via <Navigate> (render-time
    // navigation is a React anti-pattern that can throw in StrictMode).
    return <Navigate to="/lobby" replace />;
  }

  return <OnlineGamePlayInner roomCode={roomCode} />;
}

function OnlineGamePlayInner({ roomCode }: { roomCode: string }) {
  const navigate = useNavigate();
  const { game, rollDiceOnline, leaveGame, skipTurn } =
    useGameRoom(roomCode);
  // Local Convex user id — used to detect "is it my turn?" and to disable
  // the dice during opponent / bot turns.
  const { user } = useAuth();
  const anonId = useAnonId();
  // For authenticated users, use their Convex ID. For guests, use "anon-{uuid}".
  const myUserId = (user?._id as string | undefined) ?? (anonId ? `anon-${anonId}` : null);
  const [isResolving, setIsResolving] = useState(false);
  // Synchronous mirror of isResolving for dice-debounce (rapid taps can slip
  // through React state since setState is async within a frame).
  const isResolvingRef = useRef(false);
  const [lastRollValue, setLastRollValue] = useState<number | null>(null);
  const [showMoveLog, setShowMoveLog] = useState(false);
  const [highlightedTile, setHighlightedTile] = useState<number | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [animatedPositions, setAnimatedPositions] = useState<
    Record<string, number>
  >({});
  const [timeLeft, setTimeLeft] = useState(TURN_TIMEOUT_SECONDS);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const skippedRef = useRef<string | null>(null); // prevent duplicate skips
  const prevDisconnectedRef = useRef<Set<string> | null>(null);

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

  // Detect player reconnections and play chime for all connected players
  useEffect(() => {
    if (!game) return;

    const currentlyDisconnected = new Set<string>();
    game.players.forEach((p) => {
      if (!p.isConnected) currentlyDisconnected.add(p.userId);
    });

    // First run — just store the initial disconnected set, no chime
    if (prevDisconnectedRef.current === null) {
      prevDisconnectedRef.current = currentlyDisconnected;
      return;
    }

    const prev = prevDisconnectedRef.current;

    // Check if any previously-disconnected player is now connected
    for (const playerId of prev) {
      if (!currentlyDisconnected.has(playerId)) {
        // This player reconnected! Play the chime for all connected players
        soundManager.play("reconnect_chime");
        break; // One chime is enough, even if multiple reconnect at once
      }
    }

    prevDisconnectedRef.current = currentlyDisconnected;
  }, [game?.players]);

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

  // === Derivations (null-safe, before early returns so hooks see them) ===
  const boardMode = (game?.boardId ?? "classic") as "classic" | "venom";
  const isGameOver = game?.status === "finished";
  const currentPlayer = game?.players[game?.currentPlayerIndex ?? 0];
  const isExtraRoll = game?.turnPhase === "extra_roll";
  const currentPlayerDisconnected = !!currentPlayer && !currentPlayer.isConnected;
  const isBotTurn = !!currentPlayer?.isBot && !isGameOver;
  const isMyTurn =
    !isGameOver && !!myUserId && !!currentPlayer && currentPlayer.userId === myUserId;
  const winner = game?.players.find((p) => p.userId === game?.winnerId);
  const timerUrgent = timeLeft <= 10;
  const timerCritical = timeLeft <= 5;
  const timerPercent = (timeLeft / TURN_TIMEOUT_SECONDS) * 100;
  const turnNumber =
    game && game.moveLog.length > 0
      ? Math.ceil(game.moveLog.length / game.players.length)
      : 1;
  const displayPlayers = (game?.players ?? []).map((p) => ({
    id: p.userId,
    name: p.name,
    color: p.color,
    position:
      animatedPositions[p.userId] !== undefined
        ? animatedPositions[p.userId]
        : p.position,
    consecutiveSixes: p.consecutiveSixes,
    isBot: p.isBot === true,
  }));

  const handleRoll = useCallback(
    async (roll: number) => {
      if (!game?._id) return;
      // Debounce: check both React state AND a synchronous ref so rapid taps
      // can't slip through and double-roll.
      if (isResolving || isResolvingRef.current || isGameOver) return;
      isResolvingRef.current = true;
      setIsResolving(true);
      setLastRollValue(roll);

      const player = game!.players[game!.currentPlayerIndex];
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

      if (game!.status === "finished") {
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
              isResolvingRef.current = false;
              setIsResolving(false);
              setAnimatedPositions({});
            }, 500);
            animTimeoutRef.current = finalizeTimeout;
          }
        }, TILE_STEP_DELAY);
        animTimeoutRef.current = stepInterval;
      } else {
        const timeout = setTimeout(() => {
          isResolvingRef.current = false;
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

  // Auto-scroll move log (null-safe — runs on every render, guards inside)
  useEffect(() => {
    if (!game?.moveLog?.length) return;
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [game?.moveLog?.length ?? 0]);

    // Loading state — full-bleed felt bg. Distinguish undefined (still
  // loading) from null (game not found / invalid room code) so an invalid
  // code doesn't show "Loading..." forever.
  if (game === undefined) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="flex justify-center">
            <Dices className="size-12 animate-pulse text-white/60" />
          </div>
          <p className="mt-3 font-display text-sm text-white/60">
            Loading game...
          </p>
        </motion.div>
      </div>
    );
  }

  // Game not found — invalid room code or game was deleted. Show a
  // game-styled error screen with a "Back to Lobby" button instead of
  // looping on the loading screen forever.
  if (game === null) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-6"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
        }}
      >
        <div className="w-full max-w-sm rounded-3xl border border-destructive/40 bg-gradient-to-br from-destructive/15 via-card to-card p-8 text-center shadow-paper-lg">
          <div className="mb-3 flex justify-center">
            <LogOut
              className="size-12 text-destructive"
              aria-label="not found"
            />
          </div>
          <h2 className="font-display text-2xl font-bold text-destructive">
            Game not found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This room doesn&rsquo;t exist or has already ended.
          </p>
          <button
            type="button"
            onClick={() => navigate("/lobby")}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/60 bg-gradient-to-b from-primary to-primary/70 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[0_5px_0_0_oklch(0.5_0.12_55)] transition-all hover:shadow-[0_4px_0_0_oklch(0.5_0.12_55)] active:translate-y-1 active:shadow-[0_3px_0_0_oklch(0.5_0.12_55)]"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (game.status === "waiting") {
    // Still in lobby — redirect via <Navigate> (render-time navigation is
    // a React anti-pattern that can throw in StrictMode).
    return <Navigate to="/lobby" replace />;
  }

    !isGameOver &&
    !!myUserId &&
    !!currentPlayer &&
    currentPlayer.userId === myUserId;



  const handleLeave = async () => {
    if (!game?._id) {
      navigate("/home");
      return;
    }
    // Finished game — just navigate home, no penalty, no dialog.
    if (game.status === "finished") {
      navigate("/home");
      return;
    }
    // Waiting / playing — show the confirmation dialog first.
    setShowLeaveDialog(true);
  };

  const handleConfirmLeave = async () => {
    setShowLeaveDialog(false);
    if (!game?._id) {
      navigate("/home");
      return;
    }
    setIsLeaving(true);
    try {
      const result = await leaveGame({ gameId: game._id as any });
      if (result.outcome === "won_by_default") {
        // This player was the last one standing — they get the pot.
        if (result.potAwarded && result.potAwarded > 0) {
          toast.success(
            `+${result.potAwarded} coins — You won by default!`,
          );
        } else {
          toast.success("You won by default!");
        }
      } else if (result.outcome === "defeat") {
        toast.error("You left the match — counted as defeat");
      } else if (result.outcome === "removed") {
        // Pre-start leave — no toast needed (silent removal).
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLeaving(false);
      navigate("/home");
    }
  };

  const handleRematch = () => {
    navigate("/lobby");
  };

  return (
    <>
      <LandscapePrompt />
      <div
        className="fixed inset-0 overflow-hidden"
        style={{
          // Full-bleed felt table — venom variant for venom mode
          background:
            boardMode === "venom"
              ? "radial-gradient(ellipse at 50% 35%, oklch(0.26 0.04 200) 0%, oklch(0.16 0.03 200) 70%, oklch(0.12 0.02 200) 100%)"
              : "radial-gradient(ellipse at 50% 35%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
        }}
      >
        {/* Warm spotlight overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, oklch(1 0.02 80 / 0.12) 0%, transparent 55%)",
          }}
        />
        {/* Vignette for depth */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 220px 60px oklch(0 0 0 / 0.45)" }}
        />

        {/* === Top HUD: back + player chips + room code + move log === */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between gap-2 p-3 safe-top">
          {/* Leave Match (translucent game icon — confirms before penalty) */}
          <button
            onClick={handleLeave}
            aria-label="Leave match"
            disabled={isLeaving}
            className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
          >
            {isLeaving ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <LogOut className="size-5" />
            )}
          </button>

          {/* Player chips + room code badge */}
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {displayPlayers.map((player, idx) => {
                const isCurrent =
                  idx === game.currentPlayerIndex && !isGameOver;
                const dbPlayer = game.players[idx];
                const disconnected = !dbPlayer?.isConnected;
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
                    {dbPlayer?.isBot && (
                      <span
                        className="flex size-3.5 items-center justify-center rounded-full bg-secondary/25 text-secondary ring-1 ring-secondary/40"
                        title="Bot"
                      >
                        <Cpu className="size-2" />
                      </span>
                    )}
                    {disconnected && (
                      <WifiOff className="size-3 text-destructive" />
                    )}
                    {winner?.userId === player.id && (
                      <Crown className="size-3.5 text-primary" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Room code badge + connection indicator + turn counter */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 backdrop-blur-md">
              <Hash className="size-3 text-white/50" />
              <span className="font-mono text-[10px] font-semibold tracking-wider text-white/80">
                {roomCode}
              </span>
              <span className="mx-1 h-3 w-px bg-white/15" />
              <Wifi className="size-3 text-secondary" />
              <span className="text-[10px] text-white/55">Turn {turnNumber}</span>
            </div>
          </div>

          {/* Move log toggle (translucent game icon) */}
          <button
            onClick={() => setShowMoveLog(!showMoveLog)}
            aria-label="Toggle move log"
            className={
              "flex size-10 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/40 " +
              (showMoveLog ? "ring-1 ring-primary/50" : "")
            }
          >
            <ScrollText className="size-5" />
          </button>
        </div>

        {/* === Center: the board (flat, crisp, fits entirely on screen) === */}
        <div
          className="absolute inset-0 flex items-center justify-center px-2"
          style={{ paddingTop: "5.5rem", paddingBottom: "4.5rem" }}
        >
          <div
            className="relative aspect-square"
            style={{
              height: "min(calc(100vh - 10rem), 94vw)",
              maxHeight: "calc(100vh - 10rem)",
              maxWidth: "94vw",
              overflow: "hidden",
              borderRadius: "1rem",
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
                  serverRoll={handleServerRoll}
                  disabled={
                    isResolving ||
                    isGameOver ||
                    currentPlayerDisconnected ||
                    !isMyTurn
                  }
                  currentPlayerColor={currentPlayer?.color}
                  isExtraRoll={isExtraRoll}
                />
              </div>
            )}
          </div>
        </div>

        {/* === Bottom HUD: turn indicator + connection status + timer === */}
        {!isGameOver && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-2 p-4 safe-bottom">
            {/* Disconnection warning (game notification) */}
            {currentPlayerDisconnected && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/15 px-3 py-1 backdrop-blur-md"
              >
                <Timer className="size-3.5 text-destructive" />
                <span className="text-[11px] font-medium text-destructive">
                  {currentPlayer.name} disconnected — auto-skip in {timeLeft}s
                </span>
              </motion.div>
            )}

            {/* Turn indicator pill */}
            <motion.div
              key={currentPlayer?.userId + game.turnPhase}
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
              {/* Turn timer (mono) */}
              <span
                className={
                  "inline-flex items-center gap-1 text-[11px] font-mono font-medium " +
                  (timerCritical
                    ? "text-destructive"
                    : timerUrgent
                      ? "text-primary"
                      : "text-white/55")
                }
              >
                <Clock
                  className={"size-3 " + (timerCritical ? "animate-pulse" : "")}
                />
                {timeLeft}s
              </span>
              {isResolving && (
                <span className="text-[11px] text-white/55">Moving…</span>
              )}
            </motion.div>

            {/* Timer progress bar */}
            <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={
                  "h-full rounded-full " +
                  (timerCritical
                    ? "bg-destructive"
                    : timerUrgent
                      ? "bg-primary"
                      : "bg-secondary")
                }
                animate={{ width: `${timerPercent}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>

            {/* Hint / last-roll readout */}
            {!isResolving && !currentPlayerDisconnected && isMyTurn && (
              <p className="text-[11px] text-white/55">Tap the dice to roll</p>
            )}
            {!isResolving && !currentPlayerDisconnected && isBotTurn && (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-secondary/90">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary/70 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-secondary" />
                </span>
                {currentPlayer?.name} is rolling…
              </p>
            )}
            {!isResolving &&
              !currentPlayerDisconnected &&
              !isMyTurn &&
              !isBotTurn && (
                <p className="text-[11px] text-white/55">
                  Waiting for {currentPlayer?.name}…
                </p>
              )}
            {lastRollValue !== null && !isResolving && (
              <p className="text-[11px] text-white/45">
                Last roll:{" "}
                <span className="font-mono font-bold text-white/70">
                  {lastRollValue}
                </span>
              </p>
            )}
          </div>
        )}

        {/* === Game Over overlay (matches local GamePlay) === */}
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
                  className="mb-3 flex justify-center"
                >
                  <Trophy className="size-16 text-primary" />
                </motion.div>
                <h2 className="font-display text-3xl font-bold text-primary">
                  {winner.name} Wins!
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Reached tile 100 in {game.moveLog.length} moves
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  {/* Play Again — chunky primary gold */}
                  <button
                    onClick={handleRematch}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/60 bg-gradient-to-b from-primary to-primary/70 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[0_5px_0_0_oklch(0.5_0.12_55),0_10px_24px_oklch(0_0_0/0.5)] transition-all hover:shadow-[0_4px_0_0_oklch(0.5_0.12_55),0_8px_20px_oklch(0_0_0/0.55)] active:translate-y-1 active:shadow-[0_3px_0_0_oklch(0.5_0.12_55)]"
                  >
                    <RefreshCw className="size-4" />
                    Play Again
                  </button>
                  {/* Home — translucent game button */}
                  <button
                    onClick={() => navigate("/home")}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Home
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === Move log slide-in drawer (matches local GamePlay) === */}
        <AnimatePresence>
          {showMoveLog && game.moveLog.length > 0 && (
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
                  <X className="size-4" />
                </button>
              </div>
              <div className="max-h-[calc(100%-4rem)] overflow-y-auto p-4 scrollbar-thin">
                <div className="space-y-1.5">
                  {game.moveLog.map((log, i) => (
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

        {/* === Leave Match confirmation dialog === */}
        <AlertDialog
          open={showLeaveDialog}
          onOpenChange={(open) => {
            if (!isLeaving) setShowLeaveDialog(open);
          }}
        >
          <AlertDialogContent className="border-destructive/40 bg-gradient-to-br from-destructive/10 via-card to-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 font-display text-destructive">
                <AlertTriangle className="size-5" />
                Leave this match?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Leaving an in-progress match counts as a{" "}
                <span className="font-semibold text-destructive">defeat</span>
                {game?.status === "playing"
                  ? " and forfeits your entry fee. The remaining player may win by default."
                  : "."}{" "}
                Are you sure?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/15 bg-white/5 text-white/85 hover:bg-white/10 hover:text-white">
                Stay
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmLeave}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <LogOut className="mr-1.5 size-4" />
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
