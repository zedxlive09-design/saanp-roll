import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LogoDropdown } from "@/components/LogoDropdown";
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
} from "lucide-react";

const soonSections = [
  {
    icon: Bell,
    label: "Notifications",
    description: "Game invites and activity alerts",
    color: "#eab308",
  },
  {
    icon: Eye,
    label: "Accessibility",
    description: "Motion reduction, contrast, and font size",
    color: "#14b8a6",
  },
  {
    icon: Shield,
    label: "Privacy & Security",
    description: "Account data and session management",
    color: "#8b5cf6",
  },
  {
    icon: Info,
    label: "About",
    description: "Version, licenses, and credits",
    color: "#6b7280",
  },
];

const themeOptions = [
  { key: "light", icon: Sun, label: "Light" },
  { key: "dark", icon: Moon, label: "Dark" },
  { key: "system", icon: Monitor, label: "System" },
] as const;

export default function Settings() {
  const navigate = useNavigate();
  const { soundEnabled, soundVolume, setSoundEnabled, setSoundVolume } =
    useSoundSettings();
  const { theme, setTheme } = useAppTheme();

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
            <h1 className="text-lg font-bold tracking-tight">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground mb-2">
          Customize your Saanp Roll experience
        </p>

        <div className="space-y-3">
          {/* Appearance — fully functional */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="border shadow-sm">
              <CardContent className="p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                    style={{ backgroundColor: "#6366f115" }}
                  >
                    {theme === "dark" ? (
                      <Moon className="h-5 w-5" style={{ color: "#6366f1" }} />
                    ) : theme === "light" ? (
                      <Sun className="h-5 w-5" style={{ color: "#6366f1" }} />
                    ) : (
                      <Monitor className="h-5 w-5" style={{ color: "#6366f1" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Appearance</p>
                    <p className="text-xs text-muted-foreground">
                      Theme, colors, and display preferences
                    </p>
                  </div>
                </div>

                {/* Theme selector */}
                <div className="grid grid-cols-3 gap-2">
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
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-sm"
                            : "border-border hover:border-muted-foreground/40 hover:bg-accent/30"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isActive
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            isActive
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sound & Effects — fully functional */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="border shadow-sm">
              <CardContent className="p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                    style={{ backgroundColor: "#ec489915" }}
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-5 w-5" style={{ color: "#ec4899" }} />
                    ) : (
                      <VolumeX className="h-5 w-5" style={{ color: "#ec4899" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Sound & Effects</p>
                    <p className="text-xs text-muted-foreground">
                      Dice sounds, music, and effects
                    </p>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                    className="shrink-0"
                  />
                </div>

                {/* Volume slider (visible when sound is on) */}
                <motion.div
                  initial={false}
                  animate={{
                    height: soundEnabled ? "auto" : 0,
                    opacity: soundEnabled ? 1 : 0,
                  }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="volume-slider"
                        className="text-xs text-muted-foreground"
                      >
                        Volume
                      </Label>
                      <span className="text-xs font-mono text-muted-foreground tabular-nums">
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
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                      <span>Off</span>
                      <span>Max</span>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Other settings — coming soon */}
          {soonSections.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (i + 1) }}
              >
                <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: `${section.color}15` }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{ color: section.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{section.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {section.description}
                      </p>
                    </div>
                    <div className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground font-medium">
                      Soon
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>
    </motion.div>
  );
}
