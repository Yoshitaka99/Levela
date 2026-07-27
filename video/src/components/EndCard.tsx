import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, useScale } from "../theme";

/** ラストのロゴロックアップ。「オロチーム」＋スローガン。 */
export const EndCard: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScale();
  const local = frame - from;
  if (local < 0) return null;

  const enter = spring({ frame: local, fps, config: { damping: 200, mass: 0.8 } });
  const rule = interpolate(enter, [0, 1], [0, 520]) * scale;
  const opacity = interpolate(local, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        gap: 30 * scale,
        opacity,
        paddingLeft: 80 * scale,
        paddingRight: 80 * scale,
      }}
    >
      <div style={{ fontSize: 172 * scale, fontWeight: 900, letterSpacing: "0.1em" }}>
        オロチーム
      </div>
      <div style={{ width: rule, height: 3, backgroundColor: COLOR.accent }} />
      <div
        style={{
          fontSize: 42 * scale,
          fontWeight: 700,
          color: COLOR.sub,
          letterSpacing: "0.12em",
          textAlign: "center",
        }}
      >
        成約率にこだわる。成約数にこだわる。
      </div>
    </AbsoluteFill>
  );
};
