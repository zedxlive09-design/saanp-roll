import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Swords,
  Users,
  Wifi,
  Trophy,
  Settings,
  Dice1,
  ScrollText,
  Loader2,
} from "lucide-react";
import { LogoDropdown } from "@/components/LogoDropdown";
import { useAuth } from "@/hooks/use-auth";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  isLoading: statLoading,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  color: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {statLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-0.5" />
          ) : (
            <p className="text-lg font-bold">{value}</p>
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
  const statsLoading = userStats === undefined;

  const gamesWon = userStats?.wins ?? 0;
  const gamesPlayed = userStats?.totalGames ?? 0;

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
            <LogoDropdown />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Saanp Roll</h1>
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
            color="#eab308"
            isLoading={statsLoading}
          />
          <StatCard
            icon={Dice1}
            label="Games Played"
            value={String(gamesPlayed)}
            color="#6366f1"
            isLoading={statsLoading}
          />
        </div>

        {/* Play Local */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            variant="outline"
            size="lg"
            className="w-full h-24 flex items-center justify-between px-6 text-left border-2 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
            onClick={() => navigate("/game/setup")}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-base font-semibold">Play Local</p>
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
            className="w-full h-24 flex items-center justify-between px-6 text-left border-2 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
            onClick={() => navigate("/lobby")}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                <Wifi className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-semibold">Play Online</p>
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
            className="h-20 flex-col gap-1"
            onClick={() => navigate("/history")}
          >
            <ScrollText className="h-5 w-5" />
            <span className="text-xs">Match History</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-1"
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
