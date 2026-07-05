import { motion } from "framer-motion";
import { useNavigate } from "react-router";
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
} from "lucide-react";
import { LogoDropdown } from "@/components/LogoDropdown";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const navigate = useNavigate();

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
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Trophy}
            label="Games Won"
            value="0"
            color="#eab308"
          />
          <StatCard
            icon={Dice1}
            label="Games Played"
            value="0"
            color="#6366f1"
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
            className="w-full h-24 flex items-center justify-between px-6 text-left border-2 border-dashed opacity-60 cursor-not-allowed"
            disabled
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <Wifi className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-base font-semibold">Play Online</p>
                <p className="text-sm text-muted-foreground">
                  Coming soon — real-time multiplayer
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
              SOON
            </span>
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
      </main>
    </motion.div>
  );
}
