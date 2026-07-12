import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Swords,
  Users,
  Globe,
  Crown,
  Settings,
  ScrollText,
  Loader2,
  RefreshCw,
  Wifi,
  User as UserIcon,
  ChevronRight,
  LogIn,
} from "lucide-react";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/hooks/use-auth";

/**
 * Game main menu — full-bleed felt-green table, translucent player HUD at the
 * top, three big chunky mode tiles in the center, smaller utility tiles at the
 * bottom. No website header/footer. Game menu vibe only.
 */
export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const userStats = useQuery(api.games.getUserStats);
  const activeGames = useQuery(api.games.getUserActiveGames);
  const statsLoading = userStats === undefined;
  const activeGamesLoading = activeGames === undefined;

  const gamesWon = userStats?.wins ?? 0;
  const gamesPlayed = userStats?.totalGames ?? 0;

  // Games the user can reconnect to — query already filtered to user's games
  const reconnectGames = activeGames ?? [];

  const displayName = isAuthenticated
    ? (user?.name ?? user?.email?.split("@")?.[0] ?? "Player")
    : "Guest";
  const avatarInitial = displayName.charAt(0).toUpperCase() || "P";

  return (
    <div
      className="min-h-screen overflow-y-auto"
      style={{
        // Deep felt-green table gradient — matches GamePlay classic board
        background:
          "radial-gradient(ellipse at 50% 30%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
      }}
    >
      {/* Warm spotlight overlay */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 25%, oklch(1 0.02 80 / 0.14) 0%, transparent 55%)",
        }}
      />
      {/* Vignette for depth */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ boxShadow: "inset 0 0 220px 60px oklch(0 0 0 / 0.55)" }}
      />

      <div className="relative z-10">
        <OfflineBanner />

        {/* === Top HUD: player avatar + name + stats === */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto mt-3 max-w-2xl px-4 safe-top"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/30 p-3 backdrop-blur-md">
            {/* Avatar */}
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/20 text-lg font-bold text-primary">
              {isAuthenticated ? (
                avatarInitial
              ) : (
                <UserIcon className="size-6" />
              )}
            </div>
            {/* Name */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold text-white/95">
                {displayName}
              </p>
              <p className="text-xs text-white/55">
                {isAuthenticated ? "Heritage Player" : "Tap to sign in"}
              </p>
            </div>
            {/* Stats pills */}
            <div className="flex shrink-0 gap-2">
              <div className="flex flex-col items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5">
                {statsLoading ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <span className="font-display text-lg font-bold leading-none text-primary">
                    {gamesWon}
                  </span>
                )}
                <span className="mt-0.5 text-[10px] uppercase tracking-wide text-white/55">
                  Wins
                </span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-1.5">
                {statsLoading ? (
                  <Loader2 className="size-4 animate-spin text-secondary" />
                ) : (
                  <span className="font-display text-lg font-bold leading-none text-secondary">
                    {gamesPlayed}
                  </span>
                )}
                <span className="mt-0.5 text-[10px] uppercase tracking-wide text-white/55">
                  Games
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* === Reconnect banner — active games === */}
        {!activeGamesLoading && reconnectGames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-3 max-w-2xl space-y-2 px-4"
          >
            {reconnectGames.map((g) => {
              const isPlaying = g.status === "playing";
              const isDisconnected =
                isPlaying && g.players.some((p) => p.userId && !p.isConnected);
              const roomCode = g.roomCode;
              const boardName =
                g.boardId === "venom" ? "Venom Mode" : "Classic";
              const playerCount = g.players.filter((p) => p.userId).length;
              const accent = isPlaying ? "secondary" : "primary";

              return (
                <motion.button
                  key={g._id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() =>
                    navigate(
                      isPlaying ? `/game/online/${roomCode}` : `/lobby`,
                    )
                  }
                  className={
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left backdrop-blur-md transition-colors " +
                    (accent === "secondary"
                      ? "border-secondary/40 bg-secondary/10 hover:bg-secondary/15"
                      : "border-primary/40 bg-primary/10 hover:bg-primary/15")
                  }
                >
                  <div
                    className={
                      "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 " +
                      (accent === "secondary"
                        ? "bg-secondary/15 ring-secondary/20"
                        : "bg-primary/15 ring-primary/20")
                    }
                  >
                    <Wifi
                      className={
                        "size-5 " +
                        (accent === "secondary"
                          ? "text-secondary"
                          : "text-primary")
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white/95">
                      {isPlaying
                        ? isDisconnected
                          ? "Disconnected from game"
                          : "Active game in progress"
                        : "Waiting in lobby"}
                      <span className="rounded-md border border-white/20 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                        {roomCode}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-white/55">
                      {boardName} · {playerCount} player
                      {playerCount !== 1 ? "s" : ""}
                      {isDisconnected && (
                        <span className="ml-1 font-medium text-destructive">
                          · Disconnected
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={
                      "flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold " +
                      (isDisconnected
                        ? "bg-primary text-primary-foreground"
                        : "border border-white/15 bg-white/5 text-white/80")
                    }
                  >
                    <RefreshCw className="size-3.5" />
                    {isDisconnected
                      ? "Reconnect"
                      : isPlaying
                        ? "Resume"
                        : "Lobby"}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* === Center: 3 BIG mode tiles === */}
        <div className="mx-auto mt-6 max-w-2xl px-4">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-3 text-center font-display text-xs uppercase tracking-[0.4em] text-white/45"
          >
            Choose your mode
          </motion.p>

          <div className="space-y-3">
            {/* Local Game — gold accent */}
            <motion.button
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/game/setup")}
              className="group flex h-24 w-full items-center gap-4 rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-4 text-left backdrop-blur-md transition-all hover:border-primary/60 hover:shadow-[0_12px_30px_oklch(0.7_0.15_70/0.25)]"
            >
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/25 ring-1 ring-primary/40">
                <Users className="size-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold text-white/95">
                  Local Game
                </p>
                <p className="text-sm text-white/60">
                  Pass &amp; play on one device
                </p>
              </div>
              <ChevronRight className="size-6 shrink-0 text-primary/60 transition-transform group-hover:translate-x-1" />
            </motion.button>

            {/* Play Online — teal accent */}
            <motion.button
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/lobby")}
              className="group flex h-24 w-full items-center gap-4 rounded-2xl border-2 border-secondary/40 bg-gradient-to-r from-secondary/20 via-secondary/10 to-transparent p-4 text-left backdrop-blur-md transition-all hover:border-secondary/60 hover:shadow-[0_12px_30px_oklch(0.42_0.06_190/0.3)]"
            >
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary/25 ring-1 ring-secondary/40">
                <Globe className="size-7 text-secondary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold text-white/95">
                  Play Online
                </p>
                <p className="text-sm text-white/60">
                  Real-time multiplayer rooms
                </p>
              </div>
              <ChevronRight className="size-6 shrink-0 text-secondary/60 transition-transform group-hover:translate-x-1" />
            </motion.button>

            {/* With Friends — teal accent */}
            <motion.button
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/lobby")}
              className="group flex h-24 w-full items-center gap-4 rounded-2xl border-2 border-secondary/40 bg-gradient-to-r from-secondary/20 via-secondary/10 to-transparent p-4 text-left backdrop-blur-md transition-all hover:border-secondary/60 hover:shadow-[0_12px_30px_oklch(0.42_0.06_190/0.3)]"
            >
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary/25 ring-1 ring-secondary/40">
                <Swords className="size-7 text-secondary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold text-white/95">
                  With Friends
                </p>
                <p className="text-sm text-white/60">
                  Create a room &amp; share the code
                </p>
              </div>
              <ChevronRight className="size-6 shrink-0 text-secondary/60 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </div>
        </div>

        {/* === Bottom row: History + Leaderboard + Settings === */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mx-auto mt-6 max-w-2xl px-4 pb-8 safe-bottom"
        >
          <div className="grid grid-cols-3 gap-3">
            <motion.button
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/history")}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-primary/10"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <ScrollText className="size-5 text-primary" />
              </span>
              <span className="font-display text-xs font-semibold text-white/85">
                History
              </span>
            </motion.button>

            <motion.button
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/leaderboard")}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-secondary/40 hover:bg-secondary/10"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary/15 ring-1 ring-secondary/25">
                <Crown className="size-5 text-secondary" />
              </span>
              <span className="font-display text-xs font-semibold text-white/85">
                Ranks
              </span>
            </motion.button>

            <motion.button
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/settings")}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Settings className="size-5 text-white/80" />
              </span>
              <span className="font-display text-xs font-semibold text-white/85">
                Settings
              </span>
            </motion.button>
          </div>

          {/* Auth hint */}
          {!isAuthenticated && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => navigate("/auth")}
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/20 py-2.5 text-xs font-medium text-white/60 backdrop-blur-sm transition-colors hover:text-white/90"
            >
              <LogIn className="size-3.5" />
              Sign in to track stats &amp; save progress
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
