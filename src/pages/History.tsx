import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoDropdown } from "@/components/LogoDropdown";
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-background to-secondary/20"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <h1 className="font-display text-lg font-bold tracking-tight">Match History</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground mb-2">
          Your completed Saanp Seedhi matches
        </p>

        {!isAuthenticated && !authLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/30 bg-primary/10 p-6 text-center space-y-3 shadow-paper"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <p className="font-display font-medium text-sm">
              Sign in to track your match history
            </p>
            <p className="text-xs text-muted-foreground">
              Your games will appear here once you sign in and play online
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </motion.div>
        )}

        {isAuthenticated && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isAuthenticated && !isLoading && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: Dice1,
                  label: "Total Games",
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
                  value:
                    totalGames > 0
                      ? `${Math.round((wins / totalGames) * 100)}%`
                      : "—",
                  tint: "secondary" as const,
                },
              ].map((stat, i) => {
                const Icon = stat.icon;
                const tintClasses =
                  stat.tint === "primary"
                    ? "bg-primary/15 ring-primary/20 text-primary"
                    : "bg-secondary/15 ring-secondary/20 text-secondary";
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="rounded-xl border bg-card p-3 text-center shadow-paper"
                  >
                    <div
                      className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${tintClasses}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-lg font-bold font-display">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {stat.label}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* Match list */}
            {userGames && userGames.length > 0 ? (
              <div className="space-y-2">
                {userGames.map((game, i) => {
                  const mode =
                    BOARD_CONFIGS[game.boardId as "classic" | "venom"];
                  const joinedPlayers = game.players.filter((p) => p.userId);
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
                      <Card className="border shadow-paper hover:shadow-paper-lg hover:-translate-y-0.5 transition-all group">
                        <CardContent className="flex items-center gap-3 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20 shrink-0 transition-transform group-hover:scale-105">
                            <ScrollText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {mode?.name ?? game.boardId}
                              </p>
                              <span className="text-[11px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                                {joinedPlayers.length}P
                              </span>
                              {game.lastRoll !== undefined && (
                                <span className="text-[11px] text-muted-foreground">
                                  Last roll: {game.lastRoll}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                {winner?.name ?? "Unknown"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {game.moveLog.length} moves
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatRelativeTime(game.createdAt)}
                          </span>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center py-10 space-y-3"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Frown className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-display text-sm font-medium">No matches yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Play an online game and your completed matches will show up
                  here
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/lobby")}
                >
                  Play Online
                </Button>
              </motion.div>
            )}
          </>
        )}
      </main>
    </motion.div>
  );
}
