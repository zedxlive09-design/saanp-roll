import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, Play, Users, Skull } from "lucide-react";
import type { BoardMode } from "@/lib/game-engine";
import { BOARD_CONFIGS } from "@/lib/game-engine";

const PLAYER_COLORS = [
  { name: "Ruby", value: "#dc2626" },
  { name: "Sapphire", value: "#2563eb" },
  { name: "Emerald", value: "#16a34a" },
  { name: "Amber", value: "#d97706" },
];

const DEFAULT_NAMES = ["Player 1", "Player 2", "Player 3", "Player 4"];

export default function GameSetup() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(2);
  const [boardMode, setBoardMode] = useState<BoardMode>("classic");
  const [names, setNames] = useState<string[]>([...DEFAULT_NAMES]);

  const handleStartGame = () => {
    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i}`,
      name: names[i] || `Player ${i + 1}`,
      color: PLAYER_COLORS[i].value,
    }));

    navigate("/game/play", {
      state: {
        boardMode,
        players,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-background to-secondary/20"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">New Game</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Player Count */}
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Players</span>
              </div>
              <Badge variant="secondary">{playerCount}</Badge>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                disabled={playerCount <= 2}
                onClick={() => {
                  if (playerCount > 2) setPlayerCount(playerCount - 1);
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                {Array.from({ length: playerCount }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-8 w-8 rounded-full border-2"
                    style={{
                      backgroundColor: PLAYER_COLORS[i].value,
                      borderColor: PLAYER_COLORS[i].value,
                    }}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                disabled={playerCount >= 4}
                onClick={() => {
                  if (playerCount < 4) setPlayerCount(playerCount + 1);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Player Names */}
        <Card className="border shadow-sm">
          <CardContent className="p-5 space-y-3">
            <span className="font-medium">Player Names</span>
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: PLAYER_COLORS[i].value }}
                >
                  {i + 1}
                </div>
                <Input
                  value={names[i]}
                  onChange={(e) => {
                    const newNames = [...names];
                    newNames[i] = e.target.value;
                    setNames(newNames);
                  }}
                  placeholder={`Player ${i + 1}`}
                  className="flex-1"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Board Mode Selection */}
        <Card className="border shadow-sm">
          <CardContent className="p-5 space-y-3">
            <span className="font-medium">Board Mode</span>
            <div className="grid grid-cols-2 gap-3">
              {(["classic", "venom"] as BoardMode[]).map((mode) => {
                const config = BOARD_CONFIGS[mode];
                const isSelected = boardMode === mode;
                return (
                  <motion.button
                    key={mode}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setBoardMode(mode)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? mode === "venom"
                          ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                          : "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {mode === "venom" ? (
                        <Skull className="h-5 w-5 text-red-600" />
                      ) : (
                        <Play className="h-5 w-5 text-indigo-600" />
                      )}
                      <span className="font-semibold text-sm">
                        {config.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                      {config.description}
                    </p>
                    {mode === "venom" && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                      >
                        High Variance
                      </Badge>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Start Button */}
        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold"
          onClick={handleStartGame}
        >
          <Play className="mr-2 h-5 w-5" />
          Start Game
        </Button>
      </main>
    </motion.div>
  );
}
