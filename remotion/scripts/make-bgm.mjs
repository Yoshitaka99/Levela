// Synthesises the "気合いの入る" hype BGM used by the HypeTelop composition.
// Everything is generated from scratch (no sample packs, no licensing worries).
// Run: `node scripts/make-bgm.mjs` -> public/audio/hype-bgm.wav
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SAMPLE_RATE = 48000;
const BPM = 150;
const BEAT = 60 / BPM; // 0.4s
const BAR = BEAT * 4; // 1.6s
const DURATION = 7.6; // video is 7.2s; the extra tail lets the last crash ring out
const OUT = path.join(import.meta.dirname, "..", "public", "audio", "hype-bgm.wav");

const total = Math.round(DURATION * SAMPLE_RATE);
const left = new Float32Array(total);
const right = new Float32Array(total);

/** Deterministic noise so every run produces a byte-identical file. */
let seed = 0x9e3779b9;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  seed |= 0;
  return seed / 0x80000000;
};

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Soft saturation – gives the guitars/bass their bite without harsh clipping. */
const drive = (x, amount) => Math.tanh(x * amount) / Math.tanh(amount);

const add = (time, samples, pan = 0) => {
  const start = Math.round(time * SAMPLE_RATE);
  const gainL = Math.cos(((pan + 1) * Math.PI) / 4);
  const gainR = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < samples.length; i += 1) {
    const idx = start + i;
    if (idx < 0 || idx >= total) continue;
    left[idx] += samples[i] * gainL * Math.SQRT2;
    right[idx] += samples[i] * gainR * Math.SQRT2;
  }
};

const render = (seconds, fn) => {
  const n = Math.max(1, Math.round(seconds * SAMPLE_RATE));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = fn(i / SAMPLE_RATE, i / n);
  return out;
};

// ---------------------------------------------------------------- instruments

const kick = (gain = 1) =>
  render(0.34, (t) => {
    const env = Math.exp(-t * 11);
    const pitch = 52 + 120 * Math.exp(-t * 34); // punchy downward sweep
    const body = Math.sin(2 * Math.PI * pitch * t);
    const click = Math.exp(-t * 320) * rnd() * 0.6;
    return drive((body * env + click) * 1.3, 2.2) * 0.95 * gain;
  });

const snare = (gain = 1) =>
  render(0.2, (t) => {
    const env = Math.exp(-t * 22);
    const tone = Math.sin(2 * Math.PI * 190 * t) * 0.45;
    const noise = rnd() * 1.1;
    return (tone + noise) * env * 0.5 * gain;
  });

const hat = (open, gain = 1) =>
  render(open ? 0.16 : 0.045, (t) => {
    const env = Math.exp(-t * (open ? 22 : 90));
    // crude high-pass: differentiating white noise leaves the top end.
    const noise = rnd() - rnd();
    return noise * env * 0.24 * gain;
  });

const crash = (gain = 1) =>
  render(1.5, (t) => {
    const env = Math.exp(-t * 3.1);
    const noise = rnd() - rnd() * 0.85;
    const shimmer = Math.sin(2 * Math.PI * 5200 * t) * 0.1;
    return (noise + shimmer) * env * 0.3 * gain;
  });

/** Sub boom for the accent hits that land under each telop punch. */
const boom = (gain = 1) =>
  render(1.1, (t) => {
    const env = Math.exp(-t * 4.2);
    const pitch = 46 * Math.exp(-t * 0.9);
    return drive(Math.sin(2 * Math.PI * pitch * t) * env * 1.4, 1.6) * 0.9 * gain;
  });

const bass = (note, seconds, gain = 1) =>
  render(seconds, (t, p) => {
    const f = midi(note);
    const env = Math.min(1, t * 260) * Math.exp(-t * 1.4) * (1 - p * 0.25);
    // saw + square blend, then saturated for a driving rock bass
    const phase = (f * t) % 1;
    const saw = phase * 2 - 1;
    const sq = phase < 0.5 ? 1 : -1;
    const sub = Math.sin(2 * Math.PI * f * 0.5 * t);
    return drive((saw * 0.6 + sq * 0.25 + sub * 0.5) * env, 2.6) * 0.34 * gain;
  });

/** Detuned, saturated saw stack – the "power chord" stabs. */
const chord = (notes, seconds, gain = 1) =>
  render(seconds, (t, p) => {
    const env = Math.min(1, t * 400) * Math.exp(-t * 3.4) * (1 - p * 0.2);
    let acc = 0;
    for (const n of notes) {
      for (const detune of [-0.09, 0, 0.09]) {
        const f = midi(n + detune);
        const phase = (f * t + (n % 3) * 0.31) % 1;
        acc += phase * 2 - 1;
      }
    }
    acc /= notes.length * 3;
    return drive(acc * env * 1.8, 3.2) * 0.2 * gain;
  });

/** Anthemic lead line on top of the last section. */
const lead = (note, seconds, gain = 1) =>
  render(seconds, (t, p) => {
    const f = midi(note) * (1 + Math.sin(2 * Math.PI * 5.5 * t) * 0.0035);
    const env = Math.min(1, t * 90) * Math.exp(-t * 1.9) * (1 - p * 0.3);
    const phase = (f * t) % 1;
    const sq = phase < 0.5 ? 1 : -1;
    const saw = phase * 2 - 1;
    return drive((sq * 0.55 + saw * 0.45) * env, 2.0) * 0.15 * gain;
  });

/** Noise + pitch riser that tightens right before a hit. */
const riser = (seconds, gain = 1) => {
  let lp = 0;
  return render(seconds, (t, p) => {
    const shape = p ** 2.1;
    const noise = rnd();
    lp += (noise - lp) * (0.02 + shape * 0.9); // opening filter
    const sweep = Math.sin(2 * Math.PI * (180 + 1500 * shape) * t);
    return (lp * 0.8 + sweep * 0.18) * shape * 0.42 * gain;
  });
};

const roll = (start, seconds, hits) => {
  for (let i = 0; i < hits; i += 1) {
    const p = i / (hits - 1);
    add(start + (seconds * i) / hits, snare(0.25 + p * 0.85), (i % 2 ? 1 : -1) * 0.25);
  }
};

// -------------------------------------------------------------- arrangement

// i - VI - III - VII in E minor: the classic "let's go win this" progression.
const PROGRESSION = [
  { root: 40, chord: [40, 47, 52, 55] }, // Em
  { root: 36, chord: [48, 55, 60, 64] }, // C
  { root: 43, chord: [43, 50, 55, 59] }, // G
  { root: 38, chord: [50, 57, 62, 66] }, // D
  { root: 40, chord: [40, 47, 52, 55] }, // Em (tail)
];

const DROP = BEAT * 2; // 0.8s – where the beat kicks in and telop #1 lands
const HIT_2 = BEAT * 4; // 1.6s
const HIT_3 = BEAT * 6; // 2.4s

// Intro: opening impact + riser into the drop.
add(0, boom(1.0));
add(0, crash(0.85));
add(0, riser(DROP, 1.0));
roll(BEAT * 0.5, BEAT * 1.5, 6);

// Accent hits under the telop punches.
add(DROP, boom(1.0));
add(DROP, crash(1.0));
add(HIT_2, boom(0.65));
add(HIT_2, crash(0.6));
add(HIT_3, boom(1.0));
add(HIT_3, crash(0.95));
add(HIT_3 - BEAT, riser(BEAT, 0.55));
add(BAR * 4, crash(0.8)); // final bar accent

// Groove: 16th grid per bar, starting from the drop.
const KICK = [0, 4, 7, 8, 12, 14];
const SNARE = [4, 12];
const OPEN_HAT = [6, 14];
// Gallop stab pattern that keeps the energy pushing forward.
const STABS = [0, 3, 4, 6, 8, 11, 12, 14];

for (let bar = 0; bar < PROGRESSION.length; bar += 1) {
  const barStart = bar * BAR;
  const { root, chord: notes } = PROGRESSION[bar];
  const sixteenth = BEAT / 4;

  for (let step = 0; step < 16; step += 1) {
    const t = barStart + step * sixteenth;
    if (t < DROP - 1e-6 || t >= DURATION) continue;

    if (KICK.includes(step)) add(t, kick(step === 0 ? 1 : 0.85));
    if (SNARE.includes(step)) add(t, snare(1), 0.12);
    if (step % 2 === 0) add(t, hat(OPEN_HAT.includes(step), step % 4 === 0 ? 1 : 0.7), -0.2);
    if (STABS.includes(step)) {
      const len = sixteenth * 2.4;
      add(t, chord(notes, len, step === 0 ? 1.15 : 0.9), -0.35);
      add(t, chord(notes.map((n) => n + 12), len, 0.55), 0.35);
      add(t, bass(root, len, step === 0 ? 1.1 : 0.9));
    }
  }
}

// Lead melody from the third bar onwards so the back half feels like a chorus.
const MELODY = [
  [BAR * 2, 79, BEAT * 1.5],
  [BAR * 2 + BEAT * 1.5, 78, BEAT * 0.5],
  [BAR * 2 + BEAT * 2, 76, BEAT],
  [BAR * 2 + BEAT * 3, 74, BEAT],
  [BAR * 3, 76, BEAT * 1.5],
  [BAR * 3 + BEAT * 1.5, 78, BEAT * 0.5],
  [BAR * 3 + BEAT * 2, 79, BEAT * 2],
  [BAR * 4, 83, BEAT * 2],
];
for (const [t, note, len] of MELODY) {
  add(t, lead(note, len, 1), 0.1);
  add(t, lead(note - 12, len, 0.4), -0.1);
}

// ------------------------------------------------------------------ mastering

const fadeIn = Math.round(0.008 * SAMPLE_RATE);
const fadeOutStart = Math.round(7.0 * SAMPLE_RATE);
let peak = 0;
for (let i = 0; i < total; i += 1) {
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
const normalize = 0.92 / (peak || 1);

const view = Buffer.alloc(total * 4);
for (let i = 0; i < total; i += 1) {
  let env = 1;
  if (i < fadeIn) env = i / fadeIn;
  if (i >= fadeOutStart) {
    env *= clamp01(1 - (i - fadeOutStart) / (total - fadeOutStart));
  }
  const l = drive(left[i] * normalize, 1.35) * env;
  const r = drive(right[i] * normalize, 1.35) * env;
  view.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l)) * 32767), i * 4);
  view.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r)) * 32767), i * 4 + 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + view.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(2, 22); // stereo
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(view.length, 40);

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, Buffer.concat([header, view]));
console.log(
  `Wrote ${path.relative(process.cwd(), OUT)} (${DURATION}s, ${BPM}BPM, peak ${peak.toFixed(2)})`,
);
