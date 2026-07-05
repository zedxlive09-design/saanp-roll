import { useState, useCallback, useRef } from "react";
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
  rollDice,
  BOARD_CONFIGS,
} from "@/lib/game-engine";
import type { BoardMode, GameState, PlayerState } from "@/lib/game-engine";
import {
  ArrowLeft,
  RefreshCw,
  ScrollText,
} from "lucide-react";

interface LocationState {
  boardMode: BoardMode;
  players: Array<{ id: string; name: string; color: string }>;
}

export default function GamePlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  // Redirect if no state
  if (!state) {
    navigate("/game/setup", { replace: true });
    return null;
  }

  return <GamePlayInner {...state} />;
}

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
  const logEndRef = useRef<HTMLDivElement>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isGameOver = gameState.status === "game_over";
  const winner = gameState.players.find(
    (p) => p.id === gameState.winnerId,
  );

  // Check if current player gets an extra roll (rolled a 6)
  const isExtraRoll = gameState.turnPhase === "extra_roll";

  const handleRoll = useCallback(
    (roll: number) => {
      if (isResolving || isGameOver) return;

      setIsResolving(true);
      setLastRollValue(roll);

      // Apply the roll
      const afterRoll = applyRoll(gameState, roll);

      // Check if a snake or ladder was landed on for highlighting
      const player = gameState.players[gameState.currentPlayerIndex];
      const newPos = player.position + roll;
      if (newPos <= 100) {
        setHighlightedTile(newPos);
        setTimeout(() => setHighlightedTile(null), 800);
      }

      // Short delay for animation
      setTimeout(() => {
        if (afterRoll.status === "game_over") {
          setGameState(afterRoll);
          setIsResolving(false);
        } else if (afterRoll.turnPhase === "extra_roll") {
          setGameState(afterRoll);
          setIsResolving(false);
        } else {
          // Advance to next player
          const nextState = advanceTurn(afterRoll);
          setGameState(nextState);
          setIsResolving(false);
        }
      }, 600);
    },
    [gameState, isResolving, isGameOver],
  );

  const handleRematch = () => {
    setGameState(createInitialGameState(boardMode, playerSetup));
    setLastRollValue(null);
    setIsResolving(false);
    setHighlightedTile(null);
  };

  const handleNewGame = () => {
    navigate("/game/setup");
  };

  // Auto-scroll move log
  if (logEndRef.current) {
    logEndRef.current.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-background to-secondary/20"
    >
      {/* Header */}
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
              <h1 className="text-base font-bold tracking-tight">
                {BOARD_CONFIGS[boardMode].name}
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Turn {gameState.moveLog.length > 0
                  ? Math.ceil(gameState.moveLog.length / gameState.players.length)
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewGame}
              >
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
                Reached tile 100 in {gameState.moveLog.length} moves
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button
                  variant="default"
                  onClick={handleRematch}
                  className="bg-emerald-600 hover:bg-emerald-700"
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

        {/* Board */}
        <div className="flex justify-center">
          <Board
            boardId={boardMode}
            players={gameState.players}
            highlightedTile={highlightedTile}
            className="max-w-[420px] w-full"
          />
        </div>

        {/* Player indicator & dice area */}
        {!isGameOver && (
          <div className="space-y-4">
            {/* Current player banner */}
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
                        className="ml-2 text-[10px] bg-amber-100 text-amber-700"
                      >
                        Extra Roll
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Position: {currentPlayer?.position || 0}
                    {lastRollValue !== null &&
                      !isGameOver && (
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
                <p className="text-[10px] text-muted-foreground">
                  / 100
                </p>
              </div>
            </motion.div>

            {/* Dice roll area */}
            <div className="flex flex-col items-center py-2">
              <DiceRoll
                onRoll={handleRoll}
                disabled={isResolving || isGameOver}
                currentPlayerColor={currentPlayer?.color}
                isExtraRoll={isExtraRoll}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Tap the dice to roll
              </p>
            </div>
          </div>
        )}

        {/* Players progress */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            All Players
          </p>
          {gameState.players.map((player, idx) => {
            const isCurrent = idx === gameState.currentPlayerIndex && !isGameOver;
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
                  {/* Progress bar */}
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
  );
}
