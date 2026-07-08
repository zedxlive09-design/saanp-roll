/**
 * Procedural sound effects for Saanp Roll.
 *
 * Synthesizes short sound effects using the Web Audio API (OscillatorNode,
 * GainNode, etc.) and caches them for replay. No external audio files needed.
 *
 * Architecture note: This uses Howler.js as the playback layer for consistency
 * with the spec, even though the sounds themselves are synthesized procedurally
 * rather than loaded from files. Replace the synthesis functions with
 * Howler-sourced .mp3/.wav files later if you have custom audio assets.
 */

import { Howl } from "howler";

// ---------------------------------------------------------------------------
// Synthesis helpers
// ---------------------------------------------------------------------------

type SoundConfig = {
  /** Hz frequency (or array for sweeps). */
  freq: number | number[];
  /** Duration in seconds. */
  duration: number;
  /** Volume 0–1. */
  volume?: number;
  /** Waveform type. */
  type?: OscillatorType;
  /** If true, adds noise-like texture via rapid frequency modulation. */
  noisy?: boolean;
};

/**
 * Render a synthetic tone to a WAV ArrayBuffer using the Web Audio API's
 * offline rendering. Returns a blob URL that Howler can load.
 */
async function renderSfx(config: SoundConfig): Promise<string> {
  const sampleRate = 44100;
  const duration = config.duration;
  const length = sampleRate * duration;

  // Create offline audio context
  const audioCtx = new OfflineAudioContext(1, length, sampleRate);

  const masterGain = audioCtx.createGain();
  masterGain.gain.value = config.volume ?? 0.3;
  masterGain.connect(audioCtx.destination);

  // Main oscillator
  const osc = audioCtx.createOscillator();
  osc.type = config.type ?? "sine";

  const now = audioCtx.currentTime;

  if (Array.isArray(config.freq)) {
    // Frequency sweep
    osc.frequency.setValueAtTime(config.freq[0], now);
    osc.frequency.linearRampToValueAtTime(
      config.freq[config.freq.length - 1],
      now + duration,
    );
  } else {
    osc.frequency.setValueAtTime(config.freq, now);
  }

  // Amplitude envelope (fade in/out)
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.6, now + 0.01);
  gain.gain.linearRampToValueAtTime(0.4, now + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gain);
  gain.connect(masterGain);

  // Noise layer for texture (e.g., dice rattle)
  if (config.noisy) {
    const bufferSize = audioCtx.sampleRate * duration;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    noiseGain.gain.linearRampToValueAtTime(0, now + duration * 0.8);
    noise.connect(noiseGain);
    noiseGain.connect(masterGain);

    noise.start(now);
    noise.stop(now + duration);
  }

  osc.start(now);
  osc.stop(now + duration);

  // Render to buffer
  const renderedBuffer = await audioCtx.startRendering();
  const wavData = bufferToWav(renderedBuffer);
  const blob = new Blob([wavData], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

/** Convert an AudioBuffer to a WAV file ArrayBuffer. */
function bufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitsPerSample = 16;

  const data = buffer.getChannelData(0);
  const dataLength = data.length * (bitsPerSample / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write samples
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// ---------------------------------------------------------------------------
// Sound effect synthesizer
// ---------------------------------------------------------------------------

export type SoundEffect = "dice_roll" | "tile_step" | "snake_bite" | "ladder_climb" | "win_fanfare" | "overshoot";

class SoundManager {
  private cache = new Map<SoundEffect, Howl>();
  private urls: string[] = [];
  private pending: Promise<void> | null = null;
  private initialized = false;
  private _muted = false;
  private _volume = 1;

  /** Whether sound is globally muted. */
  get muted(): boolean {
    return this._muted;
  }
  set muted(val: boolean) {
    this._muted = val;
  }

  /** Master volume level from 0 to 1. */
  get volume(): number {
    return this._volume;
  }
  set volume(val: number) {
    this._volume = Math.max(0, Math.min(1, val));
  }

  /** Initialize all sound effects — call once on first user interaction. */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    this.pending = Promise.all([
      this.register("dice_roll", {
        freq: [200, 800],
        duration: 0.3,
        volume: 0.15,
        type: "triangle",
        noisy: true,
      }),
      this.register("tile_step", {
        freq: 600,
        duration: 0.04,
        volume: 0.06,
        type: "sine",
      }),
      this.register("snake_bite", {
        freq: [400, 120],
        duration: 0.35,
        volume: 0.2,
        type: "sawtooth",
      }),
      this.register("ladder_climb", {
        freq: [300, 700],
        duration: 0.3,
        volume: 0.18,
        type: "sine",
      }),
      this.register("win_fanfare", {
        freq: 784,
        duration: 0.5,
        volume: 0.25,
        type: "sine",
      }),
      this.register("overshoot", {
        freq: [300, 100],
        duration: 0.25,
        volume: 0.12,
        type: "triangle",
      }),
    ]).then(() => {});
  }

  private async register(
    name: SoundEffect,
    config: SoundConfig,
  ): Promise<void> {
    const url = await renderSfx(config);
    this.urls.push(url);
    const howl = new Howl({
      src: [url],
      format: ["wav"],
      volume: 1,
    });
    this.cache.set(name, howl);
  }

  /** Play a sound effect by name. Awaits init if still in progress. */
  async play(name: SoundEffect): Promise<void> {
    if (this._muted) return;
    if (this.pending) {
      await this.pending;
    }
    const howl = this.cache.get(name);
    if (howl) {
      howl.volume(this._volume);
      howl.play();
    }
  }

  /** Stop all currently playing sounds and release resources. */
  stopAll(): void {
    this.cache.forEach((howl) => howl.stop());
  }

  /** Release all blob URLs and clear the cache. */
  dispose(): void {
    this.stopAll();
    this.urls.forEach((url) => URL.revokeObjectURL(url));
    this.urls = [];
    this.cache.clear();
    this.pending = null;
    this.initialized = false;
  }
}

/** Singleton sound manager instance. */
export const soundManager = new SoundManager();
