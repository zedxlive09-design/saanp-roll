import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoDropdown } from "@/components/LogoDropdown";
import {
  ArrowLeft,
  Swords,
  Crown,
  Medal,
  TrendingUp,
  Timer,
  Zap,
  Users,
  Trophy,
  Loader2,
} from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  name: string;
  wins: number;
  games: number;
  color: string;
  winRate: number;
}

function getPodiumIcon(rank: number) {
  if (rank === 1) return { icon: Crown, color: "#eab308" };
  if (rank === 2) return { icon: Medal, color: "#a8a8a8" };
  if (rank === 3) return { icon: Medal, color: "#cd7f32" };
  return { icon: TrendingUp, color: "#6366f1" };
}

function getPodiumStyles(rank: number) {
  if (rank === 1)
    return {
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      borderColor: "border-amber-300 dark:border-amber-700",
    };
  if (rank === 2)
    return {
      bgColor: "bg-slate-50 dark:bg-slate-900/30",
      borderColor: "border-slate-300 dark:border-slate-700",
    };
  if (rank === 3)
    return {
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      borderColor: "border-orange-300 dark:border-orange-700",
    };
  return { bgColor: "", borderColor: "" };
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const leaderboard = useQuery(api.games.getLeaderboard);
  const isLoading = leaderboard === undefined;

  const entries: LeaderboardEntry[] = leaderboard ?? [];
  const topEntry = entries[0];

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
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <h1 className="text-lg font-bold tracking-tight">Leaderboard</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground mb-2">
          Top players ranked by total wins
        </p>

        {/* Stats overview */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: Crown,
              label: "Top Player",
              value: topEntry?.name ?? "—",
              color: "#eab308",
            },
            {
              icon: Timer,
              label: "Total Games",
              value: isLoading
                ? "..."
                : String(entries.reduce((s, e) => s + e.games, 0)),
              color: "#14b8a6",
            },
            {
              icon: Zap,
              label: "Top Wins",
              value: topEntry ? String(topEntry.wins) : "—",
              color: "#f97316",
            },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="rounded-xl border bg-card p-3 text-center shadow-sm"
              >
                <div
                  className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <Icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
                <p className="text-sm font-bold truncate">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Leaderboard list */}
        {!isLoading && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const rank = i + 1;
              const isPodium = i < 3;
              const { icon: EntryIcon, color: iconColor } =
                getPodiumIcon(rank);
              const { bgColor, borderColor } = getPodiumStyles(rank);
              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Card
                    className={`border shadow-sm hover:shadow-md transition-all ${
                      isPodium ? `${bgColor} ${borderColor} border-2` : ""
                    }`}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      {/* Rank */}
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                          isPodium
                            ? ""
                            : "bg-muted text-muted-foreground"
                        }`}
                        style={
                          isPodium
                            ? {
                                backgroundColor: `${iconColor}20`,
                                color: iconColor,
                              }
                            : {}
                        }
                      >
                        #{rank}
                      </div>

                      {/* Icon */}
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                        style={{ backgroundColor: `${entry.color}15` }}
                      >
                        <EntryIcon
                          className="h-5 w-5"
                          style={{ color: iconColor }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {entry.name}
                          {isPodium && <span className="ml-1">👑</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.wins} win{entry.wins !== 1 ? "s" : ""} ·{" "}
                          {entry.games} game{entry.games !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* Win rate */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{entry.winRate}%</p>
                        <p className="text-[11px] text-muted-foreground">
                          win rate
                        </p>
                      </div>
                    </CardContent>
                  </Card>
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
            className="text-center py-10 space-y-3"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Trophy className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No games played yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              The leaderboard will populate once players start completing online
              games
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/lobby")}
            >
              <Swords className="mr-1.5 h-3.5 w-3.5" />
              Play Online
            </Button>
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}
