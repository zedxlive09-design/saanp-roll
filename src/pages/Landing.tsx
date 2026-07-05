import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { LogoDropdown } from "@/components/LogoDropdown";
import {
  Dice1,
  Users,
  Swords,
  ChevronRight,
  Star,
  Shield,
  Zap,
} from "lucide-react";

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="group relative rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all hover:border-border hover:shadow-md hover:bg-card"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
          <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground/80 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-background via-secondary/10 to-background"
    >
      {/* Top bar */}
      <header className="border-b border-border/40 bg-background/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight">Saanp Roll</h1>
              <p className="text-xs text-muted-foreground">
                Snakes & Ladders Reimagined
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")}>
              Get Started
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl" />
            <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Dice1 className="h-3.5 w-3.5" />
                Classic board game, reimagined for mobile
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-bold tracking-tight sm:text-6xl"
            >
              <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                Saanp Seedhi
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-amber-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-amber-400">
                Reimagined
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground leading-relaxed"
            >
              The timeless game of snakes and ladders, rebuilt for modern play.
              Challenge friends locally, climb the leaderboard, and master two
              thrilling board modes — Classic and Venom.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Button
                size="lg"
                className="h-12 w-full sm:w-auto px-8 text-base font-semibold shadow-lg"
                onClick={() => navigate("/home")}
              >
                <Dice1 className="mr-2 h-5 w-5" />
                Play Now
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full sm:w-auto px-8 text-base"
                onClick={() => navigate("/game/setup")}
              >
                <Users className="mr-2 h-5 w-5" />
                Local Game
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Modes Section */}
        <section className="px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Classic Mode Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-amber-50/80 to-orange-50/80 p-6 dark:from-amber-950/20 dark:to-orange-950/10"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
                    <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Classic</h3>
                    <p className="text-xs text-muted-foreground">
                      The original experience
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Climb ladders, dodge snakes. The traditional 100-tile board
                  with the classic snake and ladder placements you remember.
                </p>
              </motion.div>

              {/* Venom Mode Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-red-50/80 to-rose-50/80 p-6 dark:from-red-950/20 dark:to-rose-950/10"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
                    <Zap className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Venom</h3>
                    <p className="text-xs text-muted-foreground">
                      Snakes only — no ladders
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A ruthless variant with 50% more snakes and zero ladders.
                  Every roll is a gamble. High risk, high tension.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 text-center"
            >
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Why Play Saanp Roll?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Modern polish on a timeless classic
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={Users}
                title="Pass & Play"
                description="Gather around one device. 2–4 players take turns rolling and racing to 100."
                delay={0.1}
              />
              <FeatureCard
                icon={Swords}
                title="Two Board Modes"
                description="Classic snakes & ladders, or Venom mode — snakes only, no safety nets."
                delay={0.2}
              />
              <FeatureCard
                icon={Shield}
                title="Fair & Authoritative"
                description="Server-validated dice in online mode. No cheats, no disputes — just pure skill and luck."
                delay={0.3}
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to Roll?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Gather your friends, pick your mode, and see who reaches 100
              first.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="h-12 w-full sm:w-auto px-8 text-base font-semibold shadow-lg"
                onClick={() => navigate("/home")}
              >
                <Dice1 className="mr-2 h-5 w-5" />
                Start Playing
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 px-4 py-6">
          <p className="text-center text-xs text-muted-foreground">
            Saanp Roll — A Snakes & Ladders game. Built with modern web
            technology.
          </p>
        </footer>
      </main>
    </motion.div>
  );
}
