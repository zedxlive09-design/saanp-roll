import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Dice5, Users, Globe2, Swords, Settings, HelpCircle } from "lucide-react";

/**
 * Game title screen — full-bleed felt-green table, big gold logo, chunky PLAY
 * button, three mode tiles. No website header/footer/nav. Pure game vibe.
 */
export default function Landing() {
  const navigate = useNavigate();

  const modes = [
    { icon: Users, label: "Local", route: "/game/setup" },
    { icon: Globe2, label: "Online", route: "/lobby" },
    { icon: Swords, label: "Friends", route: "/lobby" },
  ];

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        // Deep felt-green table gradient — matches GamePlay classic board
        background:
          "radial-gradient(ellipse at 50% 35%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
      }}
    >
      {/* Warm spotlight overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, oklch(1 0.02 80 / 0.14) 0%, transparent 55%)",
        }}
      />
      {/* Vignette for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 220px 60px oklch(0 0 0 / 0.55)" }}
      />

      {/* Top-right: Settings gear (translucent HUD button) */}
      <button
        onClick={() => navigate("/settings")}
        aria-label="Settings"
        className="absolute right-4 top-4 z-30 flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white safe-top"
      >
        <Settings className="size-5" />
      </button>

      {/* Centered title content */}
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-4 py-10 safe-top safe-bottom">
        {/* Logo block */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          <motion.h1
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.05, ease: "easeOut" }}
            className="font-display text-6xl font-bold leading-[0.9] tracking-tight sm:text-7xl md:text-8xl"
            style={{
              backgroundImage:
                "linear-gradient(180deg, oklch(0.92 0.14 75) 0%, oklch(0.74 0.16 70) 55%, oklch(0.55 0.13 60) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 4px 24px oklch(0 0 0 / 0.45)",
            }}
          >
            Saanp Seedhi
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-3 font-display text-sm uppercase tracking-[0.45em] text-white/60 sm:text-base"
          >
            Heritage Edition
          </motion.p>
        </motion.div>

        {/* Big chunky PLAY button */}
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/home")}
          className="mt-10 flex h-20 w-64 items-center justify-center gap-3 rounded-2xl border-2 border-primary/60 bg-gradient-to-b from-primary to-primary/70 text-xl font-bold uppercase tracking-wider text-primary-foreground shadow-[0_8px_0_0_oklch(0.5_0.12_55),0_14px_30px_oklch(0_0_0/0.5)] transition-all hover:shadow-[0_6px_0_0_oklch(0.5_0.12_55),0_10px_24px_oklch(0_0_0/0.55)] active:translate-y-1 active:shadow-[0_4px_0_0_oklch(0.5_0.12_55),0_6px_14px_oklch(0_0_0/0.5)]"
        >
          <Dice5 className="size-6" />
          Play
        </motion.button>

        {/* 3 mode tiles — translucent game-style cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-10 grid w-full max-w-md grid-cols-3 gap-3"
        >
          {modes.map(({ icon: Icon, label, route }) => (
            <motion.button
              key={label}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(route)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-4 backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-primary/10"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/30">
                <Icon className="size-5 text-primary" />
              </span>
              <span className="font-display text-sm font-semibold text-white/90">
                {label}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Bottom: subtle How to Play link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          onClick={() => navigate("/game/setup")}
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-xs font-medium text-white/55 transition-colors hover:text-white/85"
        >
          <HelpCircle className="size-3.5" />
          How to Play
        </motion.button>
      </div>
    </div>
  );
}
