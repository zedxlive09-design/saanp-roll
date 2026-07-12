import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSoundSettings } from "@/hooks/use-sound-settings";
import { useAppTheme } from "@/hooks/use-theme";
import {
  ArrowLeft,
  Bell,
  Volume2,
  VolumeX,
  Eye,
  Shield,
  Info,
  Sun,
  Moon,
  Monitor,
  Lock,
} from "lucide-react";

/**
 * Game settings panel — full-bleed felt-green table, translucent game cards,
 * chunky theme toggles, no website header/footer. Pure game overlay vibe.
 */
const soonSections = [
  {
    icon: Bell,
    label: "Notifications",
    description: "Game invites and activity alerts",
    tint: "primary" as const,
  },
  {
    icon: Eye,
    label: "Accessibility",
    description: "Motion reduction, contrast, and font size",
    tint: "secondary" as const,
  },
  {
    icon: Shield,
    label: "Privacy & Security",
    description: "Account data and session management",
    tint: "destructive" as const,
  },
  {
    icon: Info,
    label: "About",
    description: "Version, licenses, and credits",
    tint: "muted" as const,
  },
];

const tintClasses: Record<string, string> = {
  primary: "bg-primary/20 ring-primary/30 text-primary",
  secondary: "bg-secondary/20 ring-secondary/30 text-secondary",
  destructive: "bg-destructive/20 ring-destructive/30 text-destructive",
  muted: "bg-white/10 ring-white/20 text-white/60",
};

const themeOptions = [
  { key: "light", icon: Sun, label: "Light" },
  { key: "dark", icon: Moon, label: "Dark" },
  { key: "system", icon: Monitor, label: "Auto" },
] as const;

export default function Settings() {
  const navigate = useNavigate();
  const { soundEnabled, soundVolume, setSoundEnabled, setSoundVolume } =
    useSoundSettings();
  const { theme, setTheme } = useAppTheme();

  return (
    <div
      className="min-h-screen overflow-y-auto"
      style={{
        // Deep felt-green table gradient — matches GamePlay classic board
        background:
          "radial-gradient(ellipse at 50% 30%, oklch(0.4 0.06 150) 0%, oklch(0.28 0.05 150) 70%, oklch(0.2 0.04 150) 100%)",
      }}
    >
      {/* Warm spotlight overlay */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 25%, oklch(1 0.02 80 / 0.14) 0%, transparent 55%)",
        }}
      />
      {/* Vignette for depth */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ boxShadow: "inset 0 0 220px 60px oklch(0 0 0 / 0.55)" }}
      />

      <div className="relative z-10">
        {/* Back button — translucent game icon */}
        <button
          onClick={() => navigate("/home")}
          aria-label="Back"
          className="absolute left-4 top-4 z-30 flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white/80 backdrop-blur-md transition-colors hover:bg-black/50 hover:text-white safe-top"
        >
          <ArrowLeft className="size-5" />
        </button>

        {/* Page title */}
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-2 safe-top">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
            <h1 className="font-display text-3xl font-bold tracking-tight text-white/95">
              Settings
            </h1>
            <p className="mt-1 font-display text-xs uppercase tracking-[0.4em] text-white/45">
              Customize your game
            </p>
          </motion.div>
        </div>

        {/* Main content */}
        <main className="mx-auto max-w-2xl space-y-3 px-4 pb-10 pt-4 safe-bottom">
          {/* Appearance — translucent game card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0 bg-primary/20 ring-1 ring-primary/30">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : theme === "light" ? (
                  <Sun className="h-5 w-5 text-primary" />
                ) : (
                  <Monitor className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-base text-white/95">
                  Appearance
                </p>
                <p className="text-xs text-white/55">
                  Theme, colors, and display
                </p>
              </div>
            </div>

            {/* Theme selector — chunky game-style toggles */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTheme(opt.key)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-all cursor-pointer ${
                      isActive
                        ? "border-primary bg-primary/15 shadow-[0_4px_0_0_oklch(0.5_0.12_55)]"
                        : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isActive ? "text-primary" : "text-white/60"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-semibold ${
                        isActive ? "text-primary" : "text-white/60"
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Sound & Effects — translucent game card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0 bg-secondary/20 ring-1 ring-secondary/30">
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5 text-secondary" />
                ) : (
                  <VolumeX className="h-5 w-5 text-secondary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-base text-white/95">
                  Sound &amp; Effects
                </p>
                <p className="text-xs text-white/55">
                  Dice sounds, music, and effects
                </p>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
                className="shrink-0"
              />
            </div>

            {/* Volume slider (animated) */}
            <motion.div
              initial={false}
              animate={{
                height: soundEnabled ? "auto" : 0,
                opacity: soundEnabled ? 1 : 0,
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="volume-slider"
                    className="text-xs text-white/55"
                  >
                    Volume
                  </Label>
                  <span className="text-xs font-mono text-white/70 tabular-nums">
                    {Math.round(soundVolume * 100)}%
                  </span>
                </div>
                <Slider
                  id="volume-slider"
                  min={0}
                  max={100}
                  step={1}
                  value={[Math.round(soundVolume * 100)]}
                  onValueChange={([val]) => setSoundVolume(val / 100)}
                  className="cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-white/40">
                  <span>Off</span>
                  <span>Max</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Coming Soon — translucent disabled cards */}
          {soonSections.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (i + 1) }}
                whileHover={{ y: -2 }}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md transition-colors hover:bg-black/30"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ring-1 ${tintClasses[section.tint]}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white/85">
                    {section.label}
                  </p>
                  <p className="text-xs text-white/45 truncate">
                    {section.description}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/55 font-medium">
                  <Lock className="h-3 w-3" />
                  Soon
                </div>
              </motion.div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
