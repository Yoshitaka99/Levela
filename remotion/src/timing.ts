/**
 * The whole edit is locked to the BGM grid produced by `scripts/make-bgm.mjs`
 * (150 BPM). At 30fps one beat is exactly 12 frames and one bar is 48 frames,
 * so every telop punch can sit on a musical accent.
 */
export const FPS = 30;
export const DURATION_IN_FRAMES = 216; // 7.2s = the source clip length
export const BEAT = 12;
export const BAR = BEAT * 4;

/** Frame where the beat drops — telop line 1 lands here. */
export const DROP = BEAT * 2; // 24

/**
 * Frames where an accent lands in the music, with how hard the picture should
 * react. The opening hit is deliberately gentle so frame 0 is not blown out.
 */
export const HITS = [
  { at: 0, strength: 0.3 },
  { at: DROP, strength: 1 },
  { at: BEAT * 4, strength: 0.6 },
  { at: BEAT * 6, strength: 1 },
  { at: BAR * 3, strength: 0.45 },
  { at: BAR * 4, strength: 0.5 },
] as const;

export const LINES = [
  { text: "勝ちに行く", at: DROP },
  { text: "キモチ", at: BEAT * 4 },
  { text: "キモチ！！", at: BEAT * 6 },
] as const;

/** 0 → 1 impact envelope that spikes on `at` and decays over `decay` frames. */
export const hitEnvelope = (frame: number, at: number, decay: number) => {
  if (frame < at) return 0;
  return Math.exp(-(frame - at) / decay);
};

/** Strongest active hit at this frame, already scaled by the hit's strength. */
export const hitAmount = (frame: number, decay: number) =>
  HITS.reduce(
    (acc, hit) => Math.max(acc, hitEnvelope(frame, hit.at, decay) * hit.strength),
    0,
  );

/** Subtle "breathing" pulse locked to every beat once the drop has landed. */
export const beatPulse = (frame: number) => {
  if (frame < DROP) return 0;
  const sinceBeat = (frame - DROP) % BEAT;
  return Math.exp(-sinceBeat / 3.2);
};
