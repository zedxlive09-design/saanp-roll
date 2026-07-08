import { motion } from "framer-motion";
import { useNavigate } from "react-router";
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
} from "lucide-react";

const leaderboardEntries = [
  {
    rank: 1,
    name: "SnakeCharmer",
    wins: 42,
    games: 58,
    winRate: 72,
    icon: Crown,
    color: "#eab308",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-300 dark:border-amber-700",
  },
  {
    rank: 2,
    name: "LadderKing",
    wins: 35,
    games: 50,
    winRate: 70,
    icon: Medal,
    color: "#a8a8a8",
    bgColor: "bg-slate-50 dark:bg-slate-900/30",
    borderColor: "border-slate-300 dark:border-slate-700",
  },
  {
    rank: 3,
    name: "DiceMaster",
    wins: 28,
    games: 42,
    winRate: 67,
    icon: Medal,
    color: "#cd7f32",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-300 dark:border-orange-700",
  },
  {
    rank: 4,
    name: "RollPlayer",
    wins: 18,
    games: 30,
    winRate: 60,
    icon: TrendingUp,
    color: "#6366f1",
  },
  {
    rank: 5,
    name: "BoardWizard",
    wins: 12,
    games: 22,
    winRate: 55,
    icon: TrendingUp,
    color: "#6366f1",
  },
];

export default function Leaderboard() {
  const navigate = useNavigate();

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
          Top players ranked by performance
        </p>

        {/* Stats overview */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Crown, label: "Top Player", value: "SnakeCharmer", color: "#eab308" },
            { icon: Timer, label: "This Week", value: "12 games", color: "#14b8a6" },
            { icon: Zap, label: "Record Streak", value: "8 wins", color: "#f97316" },
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

        {/* Leaderboard list */}
        <div className="space-y-2">
          {leaderboardEntries.map((entry, i) => {
            const EntryIcon = entry.icon;
            const isPodium = i < 3;
            return (
              <motion.div
                key={entry.rank}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 * i }}
              >
                <Card
                  className={`border shadow-sm hover:shadow-md transition-all ${
                    isPodium
                      ? `${entry.bgColor} ${entry.borderColor} border-2`
                      : ""
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
                        isPodium ? { backgroundColor: `${entry.color}20`, color: entry.color } : {}
                      }
                    >
                      #{entry.rank}
                    </div>

                    {/* Icon */}
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                      style={{ backgroundColor: `${entry.color}15` }}
                    >
                      <EntryIcon
                        className="h-5 w-5"
                        style={{ color: entry.color }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.wins} wins · {entry.games} games
                      </p>
                    </div>

                    {/* Win rate */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{entry.winRate}%</p>
                      <p className="text-[11px] text-muted-foreground">win rate</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Placeholder note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-4"
        >
          <p className="text-xs text-muted-foreground">
            Leaderboard is populated with sample data.
            <br />
            Real online ranking is coming in a future update!
          </p>
        </motion.div>
      </main>
    </motion.div>
  );
}
