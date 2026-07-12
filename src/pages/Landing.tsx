import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { LogoDropdown } from "@/components/LogoDropdown";
import {
  Dice5,
  Users,
  Swords,
  ChevronRight,
  Star,
  Shield,
  Wifi,
  Globe2,
  Trophy,
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
      className="group relative rounded-2xl border border-border/60 bg-card/80 p-6 shadow-paper transition-all hover:shadow-paper-lg hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ModeCard({
  icon: Icon,
  title,
  subtitle,
  description,
  delay,
  variant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  description: string;
  delay: number;
  variant: "classic" | "venom";
}) {
  const isClassic = variant === "classic";
  return (
    <motion.div
      initial={{ opacity: 0, x: isClassic ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={
        "group relative overflow-hidden rounded-2xl border p-6 shadow-paper transition-all hover:shadow-paper-lg hover:-translate-y-0.5 " +
        (isClassic
          ? "border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card"
          : "border-destructive/30 bg-gradient-to-br from-destructive/10 via-card to-card")
      }
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={
            "flex h-11 w-11 items-center justify-center rounded-xl ring-1 " +
            (isClassic
              ? "bg-primary/15 ring-primary/20"
              : "bg-destructive/15 ring-destructive/20")
          }
        >
          <Icon className={isClassic ? "h-5 w-5 text-primary" : "h-5 w-5 text-destructive"} />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
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
      className="min-h-screen bg-background"
    >
      {/* Decorative warm gradient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <div className="hidden sm:block">
              <h1 className="font-display text-lg font-bold tracking-tight">Saanp Seedhi</h1>
              <p className="text-xs text-muted-foreground">Heritage Edition</p>
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
        {/* Hero */}
        <section className="relative px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="relative mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Dice5 className="h-3.5 w-3.5" />
                Heritage tabletop, reimagined for mobile
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-5xl font-bold tracking-tight sm:text-7xl"
            >
              <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                Saanp Seedhi
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-destructive bg-clip-text text-transparent">
                Heritage Edition
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg"
            >
              The timeless game of snakes and ladders, crafted as a premium
              tabletop experience. Play locally on one device, match with
              strangers online, or invite friends to a private room.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Button
                size="lg"
                className="h-12 w-full px-8 text-base font-semibold shadow-paper-lg sm:w-auto"
                onClick={() => navigate("/home")}
              >
                <Dice5 className="mr-2 h-5 w-5" />
                Play Now
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full px-8 text-base sm:w-auto"
                onClick={() => navigate("/game/setup")}
              >
                <Users className="mr-2 h-5 w-5" />
                Local Game
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Three ways to play */}
        <section className="px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 text-center"
            >
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Three ways to play
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                However you want to roll
              </p>
            </motion.div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FeatureCard
                icon={Users}
                title="Local"
                description="Pass & play on one device. 2–4 players, fully offline. Perfect for the couch or a road trip."
                delay={0.1}
              />
              <FeatureCard
                icon={Globe2}
                title="Online"
                description="Match with strangers in real time. Server-authoritative dice — no cheats, no disputes."
                delay={0.2}
              />
              <FeatureCard
                icon={Swords}
                title="With Friends"
                description="Create a private room, share the code, and invite your crew for a ranked showdown."
                delay={0.3}
              />
            </div>
          </div>
        </section>

        {/* Board Modes */}
        <section className="px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <ModeCard
                icon={Star}
                title="Classic"
                subtitle="The original experience"
                description="Climb ladders, dodge snakes. The traditional 100-tile board with the classic placements you remember."
                delay={0.4}
                variant="classic"
              />
              <ModeCard
                icon={Dice5}
                title="Venom"
                subtitle="Snakes only — no ladders"
                description="A ruthless variant with 50% more snakes and zero ladders. Every roll is a gamble. High risk, high tension."
                delay={0.5}
                variant="venom"
              />
            </div>
          </div>
        </section>

        {/* Why play */}
        <section className="px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 text-center"
            >
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Crafted, not cloned
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A premium take on a timeless classic
              </p>
            </motion.div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={Shield}
                title="Fair & Authoritative"
                description="Server-validated dice in online mode. No cheats, no disputes — just pure skill and luck."
                delay={0.1}
              />
              <FeatureCard
                icon={Wifi}
                title="Plays Offline"
                description="Travelling? Local mode works fully offline. Your game, your pace, no signal needed."
                delay={0.2}
              />
              <FeatureCard
                icon={Trophy}
                title="Climb the Ranks"
                description="Win online matches to earn your spot on the global leaderboard. Bragging rights included."
                delay={0.3}
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to roll?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Gather your friends, pick your mode, and see who reaches 100 first.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="h-12 w-full px-8 text-base font-semibold shadow-paper-lg sm:w-auto"
                onClick={() => navigate("/home")}
              >
                <Dice5 className="mr-2 h-5 w-5" />
                Start Playing
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 px-4 py-6">
          <p className="text-center text-xs text-muted-foreground">
            Saanp Seedhi — Heritage Edition. A crafted Snakes & Ladders experience.
          </p>
        </footer>
      </main>
    </motion.div>
  );
}
