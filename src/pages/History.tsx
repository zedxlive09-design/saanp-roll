import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoDropdown } from "@/components/LogoDropdown";
import {
  ArrowLeft,
  ScrollText,
  Dice1,
  Clock,
  Users,
  Trophy,
  Frown,
} from "lucide-react";

const recentMatches = [
  {
    id: 1,
    mode: "Classic",
    players: 2,
    winner: "Player 1",
    date: "Today",
    duration: "12 min",
  },
  {
    id: 2,
    mode: "Venom",
    players: 3,
    winner: "Player 3",
    date: "Yesterday",
    duration: "21 min",
  },
  {
    id: 3,
    mode: "Classic",
    players: 4,
    winner: "Player 2",
    date: "2 days ago",
    duration: "34 min",
  },
];

export default function History() {
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
            <h1 className="text-lg font-bold tracking-tight">Match History</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground mb-2">
          Your recent Saanp Roll matches
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Dice1, label: "Total Games", value: "3", color: "#6366f1" },
            { icon: Trophy, label: "Wins", value: "1", color: "#eab308" },
            { icon: Users, label: "Best Streak", value: "2", color: "#14b8a6" },
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
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Match list */}
        <div className="space-y-2">
          {recentMatches.map((match, i) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i }}
            >
              <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 shrink-0 transition-transform group-hover:scale-105">
                    <ScrollText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{match.mode}</p>
                      <span className="text-[11px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {match.players}P
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {match.winner}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {match.duration}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {match.date}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty state hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center py-6"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Frown className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Match history is stored locally for now.
            <br />
            Online sync is coming soon!
          </p>
        </motion.div>
      </main>
    </motion.div>
  );
}
