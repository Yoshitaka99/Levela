import React from "react";
import { AbsoluteFill, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { COLOR } from "../theme";

const NOISE_TILE = 256;

/**
 * フィルムグレイン。
 * ノイズタイルを毎フレームずらすだけにしている（SVGのfeTurbulenceは
 * 1080pだと1フレーム1秒近くかかるので使わない）。
 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  const frame = useCurrentFrame();
  const x = Math.floor(random(`grain-x-${frame}`) * NOISE_TILE);
  const y = Math.floor(random(`grain-y-${frame}`) * NOISE_TILE);

  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
        backgroundImage: `url(${staticFile("textures/noise.png")})`,
        backgroundRepeat: "repeat",
        backgroundSize: `${NOISE_TILE}px ${NOISE_TILE}px`,
        backgroundPosition: `${x}px ${y}px`,
      }}
    />
  );
};

/** 四隅を落として中央に視線を集める。 */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.9 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/** 走査線。ダッシュボード/デジタル感のあるブロックで使う。 */
export const ScanLines: React.FC<{ opacity?: number }> = ({ opacity = 0.16 }) => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 4px)",
      opacity,
      pointerEvents: "none",
    }}
  />
);

/**
 * 白フラッシュ。`at` のフレームで最大になり `length` で消える。
 * 台本の「1行ごとに白フラッシュ」用。
 */
export const Flash: React.FC<{ at: number; length?: number; color?: string; max?: number }> = ({
  at,
  length = 6,
  color = "#FFFFFF",
  max = 0.85,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [at - 1, at, at + length], [0, max, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: color, opacity, pointerEvents: "none" }} />;
};

/** 完全な黒。台本の「1秒完全な黒画面」「1.5秒の無音」用。 */
export const Blackout: React.FC<{ from: number; to: number; fade?: number }> = ({
  from,
  to,
  fade = 4,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [from - fade, from, to, to + fade],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: "#000000", opacity }} />;
};

/** 冒頭の鼓動。中心から広がる細いリング。 */
export const Heartbeat: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (p <= 0 || p >= 1) return null;

  const size = interpolate(p, [0, 1], [120, 1500]);
  const opacity = interpolate(p, [0, 0.15, 1], [0, 0.5, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `2px solid ${COLOR.fg}`,
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};

/** 画面全体のモノクロ化。⑥でカラーに戻すための対比。 */
export const Desaturate: React.FC<{ children: React.ReactNode; amount?: number }> = ({
  children,
  amount = 1,
}) => (
  <AbsoluteFill style={{ filter: `grayscale(${amount})` }}>{children}</AbsoluteFill>
);
