import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Crown,
  Medal,
  TrendingUp,
  Timer,
  Zap,
  Swords,
  Trophy,
  Loader2,
} from "lucide-react";

/**
 * Leaderboard — full-bleed felt-green table, top-3 podium with gold/silver/
 * bronze borders, ranked list below as translucent cards, HUD stats bar at
 * the top. Game rankings screen vibe.
 */
interface LeaderboardEntry {
  userId: string;
  name: string;
  wins: number;
  games: number;
  color: string;
  winRate: number;
}

function getPodiumStyle(rank: number) {
  if (rank === 1)
    return {
      border: "border-primary/50",
      strip: "bg-primary",
      badge: "bg-primary/20 ring-1 ring-primary/40 text-primary",
      iconColor: "text-primary",
    };
  if (rank === 2)
    return {
      border: "border-white/35",
      strip: "bg-white/70",
      badge: "bg-white/10 ring-1 ring-white/30 text-white/85",
      iconColor: "text-white/85",
    };
  if (rank === 3)
    return {
      border: "border-destructive/50",
      strip: "bg-destructive",
      badge: "bg-destructive/20 ring-1 ring-destructive/40 text-destructive",
      iconColor: "text-destructive",
    };
  return {
    border: "border-white/15",
    strip: "bg-white/20",
    badge: "bg-white/10 text-white/60",
    iconColor: "text-secondary",
  };
}

function getPodiumIcon(rank: number) {
  if (rank === 1) return Crown;
  if (rank === 2) return Medal;
  if (rank === 3) return Medal;
  return TrendingUp;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const leaderboard = useQuery(api.games.getLeaderboard);
  const isLoading = leaderboard === undefined;

  const entries: LeaderboardEntry[] = leaderboard ?? [];
  const topEntry = entries[0];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  const overviewStats = [
    {
      icon: Crown,
      label: "Top Player",
      value: topEntry?.name ?? "—",
      tint: "primary" as const,
    },
    {
      icon: Timer,
      label: "Total Games",
      value: isLoading
        ? "..."
        : String(entries.reduce((s, e) => s + e.games, 0)),
      tint: "secondary" as const,
    },
    {
      icon: Zap,
      label: "Top Wins",
      value: topEntry ? String(topEntry.wins) : "—",
      tint: "destructive" as const,
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
          className="absolute left-4 top-4 z-30 flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white"
        >
          <ArrowLeft className="size-5" />
        </button>

        {/* Page title */}
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-2">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
            <h1 className="font-display text-3xl font-bold tracking-tight text-white/95">
              Leaderboard
            </h1>
            <p className="mt-1 font-display text-xs uppercase tracking-[0.4em] text-white/45">
              Top players by wins
            </p>
          </motion.div>
        </div>

        <main className="mx-auto max-w-2xl space-y-4 px-4 pb-10 pt-4">
          {/* HUD stats bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-2"
          >
            {overviewStats.map((stat, i) => {
              const Icon = stat.icon;
              const tintClass =
                stat.tint === "primary"
                  ? "border-primary/30 bg-primary/10"
                  : stat.tint === "secondary"
                    ? "border-secondary/30 bg-secondary/10"
                    : "border-destructive/30 bg-destructive/10";
              const iconColor =
                stat.tint === "primary"
                  ? "text-primary"
                  : stat.tint === "secondary"
                    ? "text-secondary"
                    : "text-destructive";
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`flex flex-col items-center rounded-2xl border p-3 backdrop-blur-md ${tintClass}`}
                >
                  <Icon className={`h-4 w-4 mb-1 ${iconColor}`} />
                  <span className="font-display text-sm font-bold leading-tight text-white/95 truncate max-w-full">
                    {stat.value}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-white/55">
                    {stat.label}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          )}

          {/* Podium — top 3 with gold/silver/bronze */}
          {!isLoading && podium.length > 0 && (
            <div className="space-y-2">
              {podium.map((entry, i) => {
                const rank = i + 1;
                const style = getPodiumStyle(rank);
                const Icon = getPodiumIcon(rank);
                const topPad = rank === 1 ? "pt-6" : rank === 2 ? "pt-5" : "pt-4";
                return (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, y: -16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.1 * i, ease: "easeOut" }}
                    className={`relative overflow-hidden rounded-2xl border-2 bg-black/30 backdrop-blur-md ${style.border} ${topPad} p-4`}
                  >
                    {/* Glow accent strip */}
                    <div
                      className={`absolute inset-x-0 top-0 h-1.5 ${style.strip}`}
                    />
                    <div className="flex items-center gap-3">
                      {/* Rank badge */}
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold ${style.badge}`}
                      >
                        #{rank}
                      </div>
                      {/* Player icon */}
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ring-1 ring-white/15"
                        style={{ backgroundColor: `${entry.color}25` }}
                      >
                        <Icon className={`h-5 w-5 ${style.iconColor}`} />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-base text-white/95 truncate">
                          {entry.name}
                          {rank === 1 && (
                            <Crown className="ml-1.5 inline size-3.5 text-primary" />
                          )}
                        </p>
                        <p className="text-xs text-white/55">
                          {entry.wins} win{entry.wins !== 1 ? "s" : ""} ·{" "}
                          {entry.games} game{entry.games !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {/* Win rate */}
                      <div className="shrink-0 text-right">
                        <p className="font-display text-lg font-bold text-white/95">
                          {entry.winRate}%
                        </p>
                        <p className="text-[10px] text-white/45">win rate</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Rest of the rankings */}
          {!isLoading && rest.length > 0 && (
            <div className="space-y-2">
              {rest.map((entry, i) => {
                const rank = i + 4;
                return (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i }}
                    className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/30 p-3 backdrop-blur-md transition-all hover:border-white/25 hover:bg-black/40"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold font-display text-white/70">
                      #{rank}
                    </div>
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ring-1 ring-white/10"
                      style={{ backgroundColor: `${entry.color}25` }}
                    >
                      <TrendingUp className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white/90 truncate">
                        {entry.name}
                      </p>
                      <p className="text-xs text-white/45">
                        {entry.wins} win{entry.wins !== 1 ? "s" : ""} ·{" "}
                        {entry.games} game{entry.games !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-white/90">
                        {entry.winRate}%
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && entries.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center space-y-3 backdrop-blur-md"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
                <Trophy className="h-6 w-6 text-white/60" />
              </div>
              <p className="font-display text-base font-semibold text-white/90">
                No games played yet
              </p>
              <p className="text-xs text-white/55 max-w-xs mx-auto">
                The leaderboard will populate once players start completing
                online games
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/lobby")}
                className="border-white/20 bg-white/5 text-white/85 hover:bg-white/10"
              >
                <Swords className="mr-1.5 h-3.5 w-3.5" />
                Play Online
              </Button>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
