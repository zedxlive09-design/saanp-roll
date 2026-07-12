import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Swords,
  Users,
  Wifi,
  Trophy,
  Settings,
  Dice1,
  ScrollText,
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { LogoDropdown } from "@/components/LogoDropdown";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/hooks/use-auth";

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  isLoading: statLoading,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  tint: "primary" | "secondary";
  isLoading?: boolean;
}) {
  const tintClasses =
    tint === "primary"
      ? "bg-primary/15 ring-primary/20 text-primary"
      : "bg-secondary/15 ring-secondary/20 text-secondary";
  return (
    <Card className="border shadow-paper">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ring-1 ${tintClasses}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {statLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-0.5" />
          ) : (
            <p className="text-lg font-bold font-display">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const userStats = useQuery(api.games.getUserStats);
  const activeGames = useQuery(api.games.getUserActiveGames);
  const statsLoading = userStats === undefined;
  const activeGamesLoading = activeGames === undefined;

  const gamesWon = userStats?.wins ?? 0;
  const gamesPlayed = userStats?.totalGames ?? 0;

  // Games the user can reconnect to — query already filtered to user's games
  const reconnectGames = activeGames ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-background to-secondary/20"
    >
      <OfflineBanner />
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">Saanp Seedhi</h1>
              <p className="text-xs text-muted-foreground">Snakes & Ladders</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Live stats from Convex */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Trophy}
            label="Games Won"
            value={String(gamesWon)}
            tint="primary"
            isLoading={statsLoading}
          />
          <StatCard
            icon={Dice1}
            label="Games Played"
            value={String(gamesPlayed)}
            tint="secondary"
            isLoading={statsLoading}
          />
        </div>

        {/* Reconnect banner — active games */}
        {!activeGamesLoading && reconnectGames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {reconnectGames.map((g) => {
              const isPlaying = g.status === "playing";
              const isDisconnected =
                isPlaying &&
                g.players.some((p) => p.userId && !p.isConnected);
              const roomCode = g.roomCode;
              const boardName =
                g.boardId === "venom" ? "Venom Mode" : "Classic";
              const playerCount = g.players.filter((p) => p.userId).length;

              return (
                <Card
                  key={g._id}
                  className={`border-2 shadow-paper overflow-hidden transition-all hover:shadow-paper-lg ${
                    isPlaying
                      ? "border-secondary/40 bg-secondary/10"
                      : "border-primary/40 bg-primary/10"
                  }`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ring-1 ${
                        isPlaying
                          ? "bg-secondary/15 ring-secondary/20"
                          : "bg-primary/15 ring-primary/20"
                      }`}
                    >
                      {isPlaying ? (
                        <Wifi className="h-6 w-6 text-secondary" />
                      ) : (
                        <Users className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        {isPlaying
                          ? isDisconnected
                            ? "Disconnected from game"
                            : "Active game in progress"
                          : "Waiting in lobby"}
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono"
                        >
                          {roomCode}
                        </Badge>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {boardName} · {playerCount} player
                        {playerCount !== 1 ? "s" : ""}
                        {isDisconnected && (
                          <span className="ml-2 text-destructive font-medium">
                            · Disconnected
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant={isDisconnected ? "default" : "outline"}
                      size="sm"
                      className="shrink-0"
                      onClick={() =>
                        navigate(
                          isPlaying
                            ? `/game/online/${roomCode}`
                            : `/lobby`,
                        )
                      }
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      {isDisconnected
                        ? "Reconnect"
                        : isPlaying
                          ? "Resume"
                          : "Back to Lobby"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}

      {/* Play Local */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            variant="outline"
            size="lg"
            className="w-full h-24 flex items-center justify-between px-6 text-left border-2 hover:border-primary/40 hover:bg-primary/10 hover:-translate-y-0.5 hover:shadow-paper-lg transition-all"
            onClick={() => navigate("/game/setup")}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold font-display">Play Local</p>
                <p className="text-sm text-muted-foreground">
                  Pass & play with friends
                </p>
              </div>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
          </Button>
        </motion.div>

        {/* Play Online */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="outline"
            size="lg"
            className="w-full h-24 flex items-center justify-between px-6 text-left border-2 hover:border-secondary/40 hover:bg-secondary/10 hover:-translate-y-0.5 hover:shadow-paper-lg transition-all"
            onClick={() => navigate("/lobby")}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15 ring-1 ring-secondary/20">
                <Wifi className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-base font-semibold font-display">Play Online</p>
                <p className="text-sm text-muted-foreground">
                  Create or join a room — real-time multiplayer
                </p>
              </div>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
          </Button>
        </motion.div>

        {/* Action buttons row */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-20 flex-col gap-1 hover:-translate-y-0.5 hover:shadow-paper-lg transition-all"
            onClick={() => navigate("/history")}
          >
            <ScrollText className="h-5 w-5" />
            <span className="text-xs">Match History</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-1 hover:-translate-y-0.5 hover:shadow-paper-lg transition-all"
            onClick={() => navigate("/leaderboard")}
          >
            <Swords className="h-5 w-5" />
            <span className="text-xs">Leaderboard</span>
          </Button>
        </div>

        {/* Auth hint */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-2"
          >
            <p className="text-xs text-muted-foreground">
              <Button
                variant="link"
                className="h-auto p-0 text-xs underline"
                onClick={() => navigate("/auth")}
              >
                Sign in
              </Button>{" "}
              to track stats and save progress across sessions
            </p>
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}
