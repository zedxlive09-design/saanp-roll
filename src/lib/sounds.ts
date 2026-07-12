/**
 * Procedural sound effects for Saanp Roll.
 *
 * Synthesizes short, satisfying, game-like sound effects using the Web Audio
 * API (OfflineAudioContext: OscillatorNode, GainNode, BiquadFilterNode,
 * WaveShaperNode, AudioBufferSourceNode) and caches them for replay. No
 * external audio files needed.
 *
 * Architecture note: This uses Howler.js as the playback layer for consistency
 * with the spec, even though the sounds themselves are synthesized procedurally
 * rather than loaded from files. Replace the synthesis functions with
 * Howler-sourced .mp3/.wav files later if you have custom audio assets.
 *
 * Synthesis model:
 *   A sound is a `RichSoundConfig` made of:
 *     - `tones`:  layered oscillators (with optional harmonic partials,
 *                 frequency sweeps, detune, percussive ADSR-style envelopes)
 *     - `noise`:  layered noise bursts (white / pink / brown) shaped by an
 *                 optional biquad filter (with sweep) + tremolo for shakers
 *     - `softClip`: gentle tanh waveshaper on the master bus for warmth and
 *                 to avoid harsh digital clipping on mobile speakers
 */

import { Howl } from "howler";

// ---------------------------------------------------------------------------
// Synthesis types
// ---------------------------------------------------------------------------

/** A single additive harmonic partial. */
type Harmonic = {
  /** Frequency multiplier (2 = one octave up, etc.). */
  mul: number;
  /** Relative gain (0–1) of this partial vs the layer's base oscillator. */
  gain: number;
};

/** A layered tone (oscillator + optional harmonic partials). */
type ToneLayer = {
  /** Hz, or [start, end] for a linear frequency sweep. */
  freq: number | [number, number];
  /** Length of this layer in seconds (from its own start). */
  duration: number;
  /** Delay before this layer starts (seconds from sound start). */
  delay?: number;
  /** Waveform. Defaults to sine. */
  type?: OscillatorType;
  /** Peak gain (0–1) for this layer. Defaults to 0.3. */
  gain?: number;
  /** Attack time (s). Defaults to 0.005. */
  attack?: number;
  /** Detune in cents (for thickening / chorus). */
  detune?: number;
  /** Additive sine partials for body/warmth. */
  harmonics?: Harmonic[];
};

type NoiseColor = "white" | "pink" | "brown";

/** A layered noise burst, optionally filtered and tremolo-modulated. */
type NoiseLayer = {
  /** Length of the noise burst in seconds. */
  duration: number;
  /** Delay before this burst starts (seconds from sound start). */
  delay?: number;
  /** Noise color. Defaults to white. */
  type?: NoiseColor;
  /** Peak gain (0–1). Defaults to 0.2. */
  gain?: number;
  /** Attack time (s). Defaults to 0.005. */
  attack?: number;
  /** Release tail (s). Defaults to 0.04. */
  release?: number;
  /** Optional biquad filter on the noise. */
  filter?: BiquadFilterType;
  /** Filter center frequency (Hz). */
  filterFreq?: number;
  /** Filter Q. */
  filterQ?: number;
  /** Sweep the filter frequency over the burst [start, end] Hz. */
  filterSweep?: [number, number];
  /** Amplitude tremolo baked into the buffer (for shaker / sand textures). */
  tremolo?: { rate: number; depth: number };
};

/** Full multi-layer sound recipe. */
type RichSoundConfig = {
  /** Total render duration in seconds. */
  duration: number;
  /** Master volume (0–1). Defaults to 0.3. */
  volume?: number;
  /** Enable gentle tanh soft-clip on the master bus for warmth. */
  softClip?: boolean;
  /** Tonal layers. */
  tones?: ToneLayer[];
  /** Noise layer(s). Single or array. */
  noise?: NoiseLayer | NoiseLayer[];
};

// ---------------------------------------------------------------------------
// Synthesis helpers
// ---------------------------------------------------------------------------

/** Percussive amplitude envelope: fast attack then exp decay over duration. */
function applyPercussiveEnvelope(
  param: AudioParam,
  start: number,
  duration: number,
  peak: number,
  attack: number,
): void {
  const a = Math.max(0.0005, Math.min(attack, duration * 0.4));
  param.setValueAtTime(0.0001, start);
  param.linearRampToValueAtTime(peak, start + a);
  param.exponentialRampToValueAtTime(0.0001, start + duration);
}

/** Sustained amplitude envelope: attack → hold → exp release. */
function applySustainedEnvelope(
  param: AudioParam,
  start: number,
  duration: number,
  peak: number,
  attack: number,
  release: number,
): void {
  const a = Math.max(0.0005, Math.min(attack, duration * 0.3));
  const r = Math.max(0.004, Math.min(release, duration * 0.4));
  const holdEnd = Math.max(start + a, start + duration - r);
  param.setValueAtTime(0.0001, start);
  param.linearRampToValueAtTime(peak, start + a);
  param.setValueAtTime(peak, holdEnd);
  param.exponentialRampToValueAtTime(0.0001, start + duration);
}

/** Fill a Float32Array with the requested noise color + optional tremolo. */
function fillNoise(
  data: Float32Array,
  color: NoiseColor,
  sampleRate: number,
  tremolo?: { rate: number; depth: number },
): void {
  const n = data.length;
  if (color === "white") {
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  } else if (color === "brown") {
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    // pink (Paul Kellet's economical approximation)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  if (tremolo) {
    const { rate, depth } = tremolo;
    const twoPi = Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const m = 1 - depth + depth * (0.5 + 0.5 * Math.sin(twoPi * rate * t));
      data[i] *= m;
    }
  }
}

/** Build a tanh soft-clip curve for the master waveshaper. */
function makeTanhCurve(samples: number): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT);
  const curve = new Float32Array(buffer);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.5);
  }
  return curve;
}

/** Build a tonal layer (base oscillator + harmonic partials) into the graph. */
function buildTone(
  ctx: OfflineAudioContext,
  layer: ToneLayer,
  master: AudioNode,
  now: number,
): void {
  const start = now + (layer.delay ?? 0);
  const dur = layer.duration;
  const peak = layer.gain ?? 0.3;
  const attack = layer.attack ?? 0.005;

  const gain = ctx.createGain();
  applyPercussiveEnvelope(gain.gain, start, dur, peak, attack);
  gain.connect(master);

  const freqs: [number, number] = Array.isArray(layer.freq)
    ? [layer.freq[0], layer.freq[layer.freq.length - 1]]
    : [layer.freq, layer.freq];
  const sweep = freqs[1] !== freqs[0];

  // Base oscillator
  const osc = ctx.createOscillator();
  osc.type = layer.type ?? "sine";
  osc.frequency.setValueAtTime(freqs[0], start);
  if (sweep) osc.frequency.linearRampToValueAtTime(freqs[1], start + dur);
  if (layer.detune) osc.detune.setValueAtTime(layer.detune, start);
  osc.connect(gain);
  osc.start(start);
  osc.stop(start + dur + 0.02);

  // Additive harmonic partials (sine) for body / warmth
  if (layer.harmonics) {
    for (const h of layer.harmonics) {
      const hosc = ctx.createOscillator();
      hosc.type = "sine";
      hosc.frequency.setValueAtTime(freqs[0] * h.mul, start);
      if (sweep) {
        hosc.frequency.linearRampToValueAtTime(freqs[1] * h.mul, start + dur);
      }
      const hgain = ctx.createGain();
      hgain.gain.value = h.gain;
      hosc.connect(hgain);
      hgain.connect(gain);
      hosc.start(start);
      hosc.stop(start + dur + 0.02);
    }
  }
}

/** Build a noise layer (buffer source → optional filter → gain) into the graph. */
function buildNoise(
  ctx: OfflineAudioContext,
  layer: NoiseLayer,
  master: AudioNode,
  now: number,
  sampleRate: number,
): void {
  const start = now + (layer.delay ?? 0);
  const dur = layer.duration;
  const peak = layer.gain ?? 0.2;
  const attack = layer.attack ?? 0.005;
  const release = layer.release ?? 0.04;
  const color: NoiseColor = layer.type ?? "white";

  const len = Math.max(1, Math.ceil(sampleRate * dur));
  const buf = ctx.createBuffer(1, len, sampleRate);
  fillNoise(buf.getChannelData(0), color, sampleRate, layer.tremolo);

  const src = ctx.createBufferSource();
  src.buffer = buf;

  let last: AudioNode = src;
  if (layer.filter) {
    const filt = ctx.createBiquadFilter();
    filt.type = layer.filter;
    if (layer.filterSweep) {
      filt.frequency.setValueAtTime(layer.filterSweep[0], start);
      filt.frequency.linearRampToValueAtTime(layer.filterSweep[1], start + dur);
    } else {
      filt.frequency.value = layer.filterFreq ?? 1000;
    }
    if (layer.filterQ !== undefined) filt.Q.value = layer.filterQ;
    src.connect(filt);
    last = filt;
  }

  const gain = ctx.createGain();
  applySustainedEnvelope(gain.gain, start, dur, peak, attack, release);
  last.connect(gain);
  gain.connect(master);
  src.start(start);
  src.stop(start + dur + 0.02);
}

/**
 * Render a rich multi-layer sound to a WAV ArrayBuffer using the Web Audio
 * API's offline rendering. Returns a blob URL that Howler can load.
 */
async function renderSfx(config: RichSoundConfig): Promise<string> {
  const sampleRate = 44100;
  const duration = config.duration;
  const length = Math.ceil(sampleRate * duration);

  const ctx = new OfflineAudioContext(1, length, sampleRate);
  const now = ctx.currentTime;

  // Master bus
  const master = ctx.createGain();
  master.gain.value = config.volume ?? 0.3;

  let tail: AudioNode = master;
  if (config.softClip) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeTanhCurve(2048);
    master.connect(shaper);
    tail = shaper;
  }
  tail.connect(ctx.destination);

  // Tonal layers
  if (config.tones) {
    for (const t of config.tones) buildTone(ctx, t, master, now);
  }

  // Noise layers
  if (config.noise) {
    const arr: NoiseLayer[] = Array.isArray(config.noise)
      ? config.noise
      : [config.noise];
    for (const nl of arr) buildNoise(ctx, nl, master, now, sampleRate);
  }

  const rendered = await ctx.startRendering();
  const wav = bufferToWav(rendered);
  const blob = new Blob([wav], { type: "audio/wav" });
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

  // Write samples (mono render — channel 0)
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

export type SoundEffect =
  | "dice_roll"
  | "tile_step"
  | "footstep"
  | "ladder_run"
  | "snake_slither"
  | "snake_bite"
  | "ladder_climb"
  | "win_fanfare"
  | "overshoot"
  | "reconnect_chime";

/** Soft wooden "tock" — a piece dropping on a wooden board. Shared by footstep + tile_step. */
const tockConfig: RichSoundConfig = {
  duration: 0.06,
  volume: 0.5,
  softClip: true,
  tones: [
    {
      freq: 200,
      duration: 0.05,
      type: "sine",
      gain: 0.55,
      attack: 0.002,
      harmonics: [
        { mul: 2, gain: 0.22 },
        { mul: 3, gain: 0.1 },
      ],
    },
  ],
  noise: [
    {
      duration: 0.02,
      type: "white",
      gain: 0.18,
      filter: "highpass",
      filterFreq: 2200,
      attack: 0.001,
      release: 0.01,
    },
  ],
};

/** Ascending ladder rungs — square pings climbing in pitch. Shared by ladder_run + ladder_climb. */
const ladderConfig: RichSoundConfig = {
  duration: 0.36,
  volume: 0.42,
  softClip: true,
  tones: [300, 400, 500, 600, 700].map((f, i) => ({
    freq: f as number,
    duration: 0.07,
    delay: i * 0.06,
    type: "square" as OscillatorType,
    gain: 0.3,
    attack: 0.004,
    harmonics: [
      { mul: 2, gain: 0.18 },
      { mul: 3, gain: 0.08 },
    ],
  })),
  noise: [0, 1, 2, 3, 4].map((i) => ({
    duration: 0.02,
    delay: i * 0.06,
    type: "white" as NoiseColor,
    gain: 0.06,
    filter: "highpass" as BiquadFilterType,
    filterFreq: 2500,
    attack: 0.001,
    release: 0.008,
  })),
};

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
      // dice_roll — wooden clatter: throw burst + 4 staggered clacks + settle thud
      this.register("dice_roll", {
        duration: 0.4,
        volume: 0.5,
        softClip: true,
        tones: [
          { freq: 170, duration: 0.035, delay: 0.0, type: "square", gain: 0.32, attack: 0.002 },
          { freq: 195, duration: 0.035, delay: 0.07, type: "square", gain: 0.3, attack: 0.002 },
          { freq: 150, duration: 0.035, delay: 0.14, type: "square", gain: 0.3, attack: 0.002 },
          { freq: 210, duration: 0.035, delay: 0.21, type: "square", gain: 0.28, attack: 0.002 },
          {
            freq: 90,
            duration: 0.1,
            delay: 0.27,
            type: "sine",
            gain: 0.4,
            attack: 0.003,
            harmonics: [
              { mul: 2, gain: 0.25 },
              { mul: 3, gain: 0.12 },
            ],
          },
        ],
        noise: [
          { duration: 0.07, delay: 0.0, type: "white", gain: 0.3, filter: "bandpass", filterFreq: 1400, filterQ: 0.8, attack: 0.002, release: 0.03 },
          { duration: 0.03, delay: 0.07, type: "white", gain: 0.12, filter: "highpass", filterFreq: 1800, attack: 0.001, release: 0.01 },
          { duration: 0.03, delay: 0.14, type: "white", gain: 0.12, filter: "highpass", filterFreq: 1800, attack: 0.001, release: 0.01 },
          { duration: 0.03, delay: 0.21, type: "white", gain: 0.12, filter: "highpass", filterFreq: 1800, attack: 0.001, release: 0.01 },
        ],
      }),

      // tile_step / footstep — soft wooden tock
      this.register("tile_step", tockConfig),
      this.register("footstep", tockConfig),

      // snake_bite — dramatic descending slide + hiss + landing thud
      this.register("snake_bite", {
        duration: 0.42,
        volume: 0.5,
        softClip: true,
        tones: [
          { freq: [500, 80], duration: 0.36, type: "sawtooth", gain: 0.3, attack: 0.005, detune: -6 },
          { freq: [500, 80], duration: 0.36, type: "sawtooth", gain: 0.22, attack: 0.005, detune: 7 },
          { freq: [100, 50], duration: 0.36, type: "sine", gain: 0.25, attack: 0.005 },
          {
            freq: 60,
            duration: 0.11,
            delay: 0.31,
            type: "sine",
            gain: 0.45,
            attack: 0.003,
            harmonics: [{ mul: 2, gain: 0.2 }],
          },
        ],
        noise: [
          {
            duration: 0.4,
            type: "white",
            gain: 0.18,
            filter: "bandpass",
            filterFreq: 2200,
            filterQ: 0.7,
            filterSweep: [3000, 700],
            attack: 0.01,
            release: 0.05,
          },
        ],
      }),

      // snake_slither — filtered sand/shaker noise with a faint tonal glue
      this.register("snake_slither", {
        duration: 0.5,
        volume: 0.4,
        softClip: false,
        tones: [
          { freq: [1200, 600], duration: 0.5, type: "sine", gain: 0.06, attack: 0.02 },
        ],
        noise: [
          {
            duration: 0.5,
            type: "pink",
            gain: 0.32,
            filter: "bandpass",
            filterFreq: 2500,
            filterQ: 1.2,
            filterSweep: [3000, 1200],
            attack: 0.02,
            release: 0.06,
            tremolo: { rate: 18, depth: 0.5 },
          },
        ],
      }),

      // ladder_run / ladder_climb — ascending rung pings
      this.register("ladder_run", ladderConfig),
      this.register("ladder_climb", ladderConfig),

      // win_fanfare — triumphant C5→E5→G5→C6 arpeggio + sparkle
      this.register("win_fanfare", {
        duration: 0.72,
        volume: 0.42,
        softClip: false,
        tones: [
          { freq: 523, duration: 0.18, delay: 0.0, type: "sine", gain: 0.32, attack: 0.008, harmonics: [{ mul: 2, gain: 0.22 }, { mul: 3, gain: 0.1 }] },
          { freq: 659, duration: 0.18, delay: 0.13, type: "sine", gain: 0.32, attack: 0.008, harmonics: [{ mul: 2, gain: 0.22 }, { mul: 3, gain: 0.1 }] },
          { freq: 784, duration: 0.18, delay: 0.26, type: "sine", gain: 0.34, attack: 0.008, harmonics: [{ mul: 2, gain: 0.22 }, { mul: 3, gain: 0.1 }] },
          { freq: 1047, duration: 0.22, delay: 0.39, type: "sine", gain: 0.36, attack: 0.008, harmonics: [{ mul: 2, gain: 0.24 }, { mul: 3, gain: 0.12 }] },
          { freq: 2093, duration: 0.18, delay: 0.52, type: "sine", gain: 0.18, attack: 0.004 },
        ],
      }),

      // overshoot — game-show fail buzzer
      this.register("overshoot", {
        duration: 0.24,
        volume: 0.42,
        softClip: true,
        tones: [
          { freq: 150, duration: 0.22, type: "square", gain: 0.3, attack: 0.004, detune: -4 },
          { freq: 150, duration: 0.22, type: "square", gain: 0.22, attack: 0.004, detune: 5 },
          { freq: 450, duration: 0.22, type: "sine", gain: 0.1, attack: 0.004 },
        ],
        noise: [
          { duration: 0.22, type: "white", gain: 0.08, filter: "bandpass", filterFreq: 1500, filterQ: 0.6, attack: 0.004, release: 0.03 },
        ],
      }),

      // reconnect_chime — C5 → G5 ascending chime (kept), warmed with harmonics
      this.register("reconnect_chime", {
        duration: 0.38,
        volume: 0.32,
        softClip: false,
        tones: [
          { freq: 523, duration: 0.16, delay: 0.0, type: "sine", gain: 0.32, attack: 0.006, harmonics: [{ mul: 2, gain: 0.2 }] },
          { freq: 784, duration: 0.22, delay: 0.13, type: "sine", gain: 0.34, attack: 0.006, harmonics: [{ mul: 2, gain: 0.22 }] },
        ],
      }),
    ]).then(() => {});
  }

  private async register(
    name: SoundEffect,
    config: RichSoundConfig,
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
