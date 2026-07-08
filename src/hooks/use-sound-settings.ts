import { useState, useCallback, useEffect } from "react";
import { soundManager } from "@/lib/sounds";

const STORAGE_KEY = "saanp-roll-sound";

interface SoundSettings {
  enabled: boolean;
  volume: number;
}

const DEFAULTS: SoundSettings = { enabled: true, volume: 0.7 };

function loadSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled:
          typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULTS.enabled,
        volume:
          typeof parsed.volume === "number"
            ? Math.max(0, Math.min(1, parsed.volume))
            : DEFAULTS.volume,
      };
    }
  } catch {
    // ignore corrupt data
  }
  return DEFAULTS;
}

function saveSettings(settings: SoundSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage may be unavailable
  }
}

export function useSoundSettings() {
  const [settings, setSettings] = useState<SoundSettings>(loadSettings);

  // Sync settings to the SoundManager singleton
  useEffect(() => {
    soundManager.muted = !settings.enabled;
    soundManager.volume = settings.volume;
  }, [settings]);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, enabled };
      saveSettings(next);
      return next;
    });
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings((prev) => {
      const next = { ...prev, volume: Math.max(0, Math.min(1, volume)) };
      saveSettings(next);
      return next;
    });
  }, []);

  return {
    soundEnabled: settings.enabled,
    soundVolume: settings.volume,
    setSoundEnabled: setEnabled,
    setSoundVolume: setVolume,
  };
}
