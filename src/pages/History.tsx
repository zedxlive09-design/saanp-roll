import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { BOARD_CONFIGS } from "@/lib/game-engine";
import {
  ArrowLeft,
  ScrollText,
  Dice1,
  Trophy,
  Frown,
  Users,
  Clock,
  Wifi,
  Loader2,
} from "lucide-react";

/**
 * Match history — full-bleed felt-green table, HUD stats bar at the top
 * (Games / Wins / Win Rate), translucent match cards below. Game stats
 * screen vibe, not a website list.
 */
function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function History() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const userGames = useQuery(api.games.getUserGames);
  const isLoading = userGames === undefined || authLoading;

  // Compute stats from real data
  const totalGames = userGames?.length ?? 0;
  const wins =
    userGames?.filter(
      (g) => g.winnerId && g.players.some((p) => p.isConnected),
    ).length ?? 0;
  const winRate =
    totalGames > 0 ? `${Math.round((wins / totalGames) * 100)}%` : "—";

  const stats = [
    {
      icon: Dice1,
      label: "Games",
      value: String(totalGames),
      tint: "secondary" as const,
    },
    {
      icon: Trophy,
      label: "Wins",
      value: String(wins),
      tint: "primary" as const,
    },
    {
      icon: Wifi,
      label: "Win Rate",
      value: winRate,
      tint: "secondary" as const,
    },
  ];

  return (
    <div
      className="min-h-screen overflow-y-auto"
      style={{
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
        {/* Back button — translucent game icon */}
        <button
          onClick={() => navigate("/home")}
          aria-label="Back"
          className="absolute left-4 top-4 z-30 flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white safe-top"
        >
          <ArrowLeft className="size-5" />
        </button>

        {/* Page title */}
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-2 safe-top">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
            <h1 className="font-display text-3xl font-bold tracking-tight text-white/95">
              Match History
            </h1>
            <p className="mt-1 font-display text-xs uppercase tracking-[0.4em] text-white/45">
              Your completed matches
            </p>
          </motion.div>
        </div>

        <main className="mx-auto max-w-2xl space-y-4 px-4 pb-10 pt-4 safe-bottom">
          {/* Sign-in prompt (guest) */}
          {!isAuthenticated && !authLoading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-primary/40 bg-primary/10 p-6 text-center space-y-3 backdrop-blur-md"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <p className="font-display font-medium text-base text-white/95">
                Sign in to track your match history
              </p>
              <p className="text-xs text-white/55">
                Your games will appear here once you sign in and play online
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/auth")}
                className="shadow-[0_4px_0_0_oklch(0.5_0.12_55)]"
              >
                Sign In
              </Button>
            </motion.div>
          )}

          {/* Loading state */}
          {isAuthenticated && isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          )}

          {isAuthenticated && !isLoading && (
            <>
              {/* HUD stats bar */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-2"
              >
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  const tintClass =
                    stat.tint === "primary"
                      ? "border-primary/30 bg-primary/10"
                      : "border-secondary/30 bg-secondary/10";
                  const iconColor =
                    stat.tint === "primary" ? "text-primary" : "text-secondary";
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className={`flex flex-col items-center rounded-2xl border p-3 backdrop-blur-md ${tintClass}`}
                    >
                      <Icon className={`h-4 w-4 mb-1 ${iconColor}`} />
                      <span className="font-display text-xl font-bold leading-none text-white/95">
                        {stat.value}
                      </span>
                      <span className="mt-1 text-[10px] uppercase tracking-wider text-white/55">
                        {stat.label}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Match list */}
              {userGames && userGames.length > 0 ? (
                <div className="space-y-2">
                  {userGames.map((game, i) => {
                    const mode =
                      BOARD_CONFIGS[game.boardId as "classic" | "venom"];
                    const joinedPlayers = game.players.filter(
                      (p) => p.userId,
                    );
                    const winner = game.players.find(
                      (p) => p.userId === game.winnerId,
                    );
                    return (
                      <motion.div
                        key={game._id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 * i }}
                      >
                        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-md transition-all hover:border-primary/40 hover:bg-black/40">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/30 shrink-0">
                            <ScrollText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-display font-semibold text-sm text-white/95">
                                {mode?.name ?? game.boardId}
                              </p>
                              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
                                {joinedPlayers.length}P
                              </span>
                              {game.lastRoll !== undefined && (
                                <span className="text-[11px] text-white/45">
                                  Last roll: {game.lastRoll}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-3 text-xs text-white/55">
                              <span className="flex items-center gap-1">
                                <Trophy className="h-3 w-3 text-primary" />
                                {winner?.name ?? "Unknown"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {game.moveLog.length} moves
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] text-white/45">
                            {formatRelativeTime(game.createdAt)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center space-y-3 backdrop-blur-md"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
                    <Frown className="h-6 w-6 text-white/60" />
                  </div>
                  <p className="font-display text-base font-semibold text-white/90">
                    No matches yet
                  </p>
                  <p className="text-xs text-white/55 max-w-xs mx-auto">
                    Play an online game and your completed matches will show up
                    here
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/lobby")}
                    className="border-white/20 bg-white/5 text-white/85 hover:bg-white/10"
                  >
                    Play Online
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
