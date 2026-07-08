import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoDropdown } from "@/components/LogoDropdown";
import {
  ArrowLeft,
  Palette,
  Bell,
  Volume2,
  Eye,
  Shield,
  Info,
} from "lucide-react";

const settingsSections = [
  {
    icon: Palette,
    label: "Appearance",
    description: "Theme, colors, and display preferences",
    color: "#6366f1",
  },
  {
    icon: Volume2,
    label: "Sound & Effects",
    description: "Dice sounds, music, and volume",
    color: "#ec4899",
  },
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

export default function Settings() {
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
          {settingsSections.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
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
