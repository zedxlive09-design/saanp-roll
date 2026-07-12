import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, Play, Users, Skull } from "lucide-react";
import type { BoardMode } from "@/lib/game-engine";
import { BOARD_CONFIGS } from "@/lib/game-engine";

/**
 * Game setup screen — full-bleed felt-green table, translucent setup panels,
 * chunky +/- player count buttons, translucent name inputs, two big board-mode
 * tiles (Classic=primary gold, Venom=destructive terracotta), big chunky Start
 * Game button. All logic preserved: playerCount / boardMode / names state,
 * PlayerSetup[] creation, navigate("/game/play", { state }).
 */
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
    <div
      className="min-h-screen overflow-y-auto"
      style={{
        // Deep felt-green table gradient — matches Landing/Home/GamePlay
        background:
          "radial-gradient(ellipse at 50% 30%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
      }}
    >
      {/* Warm spotlight overlay */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 22%, oklch(1 0.02 80 / 0.14) 0%, transparent 55%)",
        }}
      />
      {/* Vignette for depth */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ boxShadow: "inset 0 0 220px 60px oklch(0 0 0 / 0.55)" }}
      />

      {/* Back button top-left (translucent game icon) */}
      <button
        onClick={() => navigate("/home")}
        aria-label="Back"
        className="fixed left-4 top-4 z-30 flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white safe-top"
      >
        <ArrowLeft className="size-5" />
      </button>

      {/* Main scrollable content */}
      <div className="relative z-10 mx-auto max-w-md px-4 pb-32 pt-20 safe-top safe-bottom">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 text-center"
        >
          <h1 className="font-display text-4xl font-bold tracking-tight text-white/95">
            New Game
          </h1>
          <p className="mt-1 font-display text-xs uppercase tracking-[0.4em] text-white/45">
            Set up the table
          </p>
        </motion.div>

        {/* === Player Count panel === */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
                <Users className="size-4 text-primary" />
              </span>
              <span className="font-display text-sm font-semibold text-white/90">
                Players
              </span>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 font-display text-sm font-bold text-primary">
              {playerCount}
            </span>
          </div>

          <div className="flex items-center justify-center gap-4">
            {/* Minus chunky button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              disabled={playerCount <= 2}
              onClick={() => {
                if (playerCount > 2) setPlayerCount(playerCount - 1);
              }}
              aria-label="Remove player"
              className="flex size-12 items-center justify-center rounded-2xl border-2 border-white/20 bg-white/5 text-white/90 backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:bg-white/5"
            >
              <Minus className="size-5" />
            </motion.button>

            {/* Player color dots */}
            <div className="flex gap-2">
              {Array.from({ length: playerCount }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="size-9 rounded-full border-2 shadow-[0_4px_12px_oklch(0_0_0/0.4)]"
                  style={{
                    backgroundColor: PLAYER_COLORS[i].value,
                    borderColor: PLAYER_COLORS[i].value,
                  }}
                />
              ))}
            </div>

            {/* Plus chunky button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              disabled={playerCount >= 4}
              onClick={() => {
                if (playerCount < 4) setPlayerCount(playerCount + 1);
              }}
              aria-label="Add player"
              className="flex size-12 items-center justify-center rounded-2xl border-2 border-white/20 bg-white/5 text-white/90 backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:bg-white/5"
            >
              <Plus className="size-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* === Player Names panel === */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="mt-4 rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-md"
        >
          <p className="mb-3 font-display text-sm font-semibold text-white/90">
            Player Names
          </p>
          <div className="space-y-2.5">
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-[0_3px_8px_oklch(0_0_0/0.4)]"
                  style={{ backgroundColor: PLAYER_COLORS[i].value }}
                >
                  {i + 1}
                </div>
                <input
                  value={names[i]}
                  onChange={(e) => {
                    const newNames = [...names];
                    newNames[i] = e.target.value;
                    setNames(newNames);
                  }}
                  placeholder={`Player ${i + 1}`}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 backdrop-blur-sm transition-colors focus:border-primary/60 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* === Board Mode panel === */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="mt-4 rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-md"
        >
          <p className="mb-3 font-display text-sm font-semibold text-white/90">
            Board Mode
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(["classic", "venom"] as BoardMode[]).map((mode) => {
              const config = BOARD_CONFIGS[mode];
              const isSelected = boardMode === mode;
              const isVenom = mode === "venom";
              const Icon = isVenom ? Skull : Play;
              return (
                <motion.button
                  key={mode}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -2 }}
                  onClick={() => setBoardMode(mode)}
                  className={
                    "relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center backdrop-blur-md transition-all " +
                    (isSelected
                      ? isVenom
                        ? "border-destructive/70 bg-destructive/15 shadow-[0_8px_24px_oklch(0.5_0.15_35/0.3)]"
                        : "border-primary/70 bg-primary/15 shadow-[0_8px_24px_oklch(0.7_0.15_70/0.3)]"
                      : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10")
                  }
                >
                  <span
                    className={
                      "flex size-10 items-center justify-center rounded-xl ring-1 " +
                      (isVenom
                        ? "bg-destructive/20 ring-destructive/30"
                        : "bg-primary/20 ring-primary/30")
                    }
                  >
                    <Icon
                      className={
                        "size-5 " +
                        (isVenom ? "text-destructive" : "text-primary")
                      }
                    />
                  </span>
                  <span className="font-display text-sm font-bold text-white/95">
                    {config.name}
                  </span>
                  <p className="text-[10px] leading-relaxed text-white/55">
                    {config.description}
                  </p>
                  {isVenom && (
                    <span className="absolute right-2 top-2 rounded-full border border-destructive/40 bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-destructive">
                      High Variance
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* === Sticky Start button === */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 safe-bottom">
        <div
          className="mx-auto max-w-md"
          style={{
            background:
              "linear-gradient(to top, oklch(0.14 0.03 150) 30%, transparent 100%)",
            paddingTop: "1.5rem",
            paddingBottom: "0.25rem",
          }}
        >
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStartGame}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary/60 bg-gradient-to-b from-primary to-primary/70 text-lg font-bold uppercase tracking-wider text-primary-foreground shadow-[0_7px_0_0_oklch(0.5_0.12_55),0_14px_30px_oklch(0_0_0/0.5)] transition-all hover:shadow-[0_5px_0_0_oklch(0.5_0.12_55),0_10px_24px_oklch(0_0_0/0.55)] active:translate-y-1 active:shadow-[0_4px_0_0_oklch(0.5_0.12_55),0_6px_14px_oklch(0_0_0/0.5)]"
          >
            <Play className="size-5" />
            Start Game
          </motion.button>
        </div>
      </div>
    </div>
  );
}
