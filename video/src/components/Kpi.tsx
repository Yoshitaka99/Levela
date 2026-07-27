import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { COLOR, useIsPortrait, useScale } from "../theme";

const countUp = (local: number, duration: number, to: number) =>
  interpolate(local, [0, duration], [0, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const Tile: React.FC<{
  label: string;
  value: string;
  unit: string;
  delta?: string;
  scale: number;
}> = ({ label, value, unit, delta, scale }) => (
  <div
    style={{
      flex: 1,
      borderTop: `2px solid ${COLOR.line}`,
      paddingTop: 26 * scale,
      display: "flex",
      flexDirection: "column",
      gap: 10 * scale,
    }}
  >
    <div
      style={{
        fontSize: 34 * scale,
        fontWeight: 700,
        color: COLOR.sub,
        letterSpacing: "0.14em",
      }}
    >
      {label}
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 * scale }}>
      <div
        style={{
          fontSize: 168 * scale,
          fontWeight: 900,
          lineHeight: 1,
          color: COLOR.fg,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 52 * scale, fontWeight: 700, color: COLOR.fg }}>{unit}</div>
    </div>
    {delta ? (
      <div
        style={{
          fontSize: 30 * scale,
          fontWeight: 700,
          color: COLOR.accent,
          letterSpacing: "0.06em",
        }}
      >
        {delta}
      </div>
    ) : null}
  </div>
);

/**
 * ③「数字は嘘をつかない」のインサート。
 * 成約率と成約数がカウントアップしていく。
 * 実数を出したい場合は rate / count を差し替える。
 */
export const KpiBoard: React.FC<{
  from: number;
  duration: number;
  rate?: number;
  count?: number;
}> = ({ from, duration, rate = 38.4, count = 127 }) => {
  const frame = useCurrentFrame();
  const scale = useScale();
  const isPortrait = useIsPortrait();
  const local = frame - from;
  if (local < 0 || local > duration) return null;

  const fade = interpolate(local, [0, 14, duration - 16, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rollDuration = Math.min(110, duration - 40);
  const rateNow = countUp(local, rollDuration, rate).toFixed(1);
  const countNow = Math.round(countUp(local - 16, rollDuration, count));

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        paddingLeft: 170 * scale,
        paddingRight: 170 * scale,
        opacity: fade,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isPortrait ? "column" : "row",
          gap: (isPortrait ? 70 : 110) * scale,
        }}
      >
        <Tile label="成約率" value={rateNow} unit="%" delta="▲ あと1本で変わる" scale={scale} />
        <Tile label="成約数" value={String(countNow)} unit="件" delta="▲ 今月" scale={scale} />
      </div>
    </AbsoluteFill>
  );
};

/** 背景の細いグリッド。ダッシュボードっぽさを足す。 */
export const Grid: React.FC<{ opacity?: number }> = ({ opacity = 0.5 }) => {
  const scale = useScale();
  const cell = `${120 * scale}px ${120 * scale}px`;

  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage: `linear-gradient(${COLOR.line} 1px, transparent 1px), linear-gradient(90deg, ${COLOR.line} 1px, transparent 1px)`,
        backgroundSize: cell,
        maskImage: "radial-gradient(ellipse at center, black 20%, transparent 78%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 78%)",
        pointerEvents: "none",
      }}
    />
  );
};
