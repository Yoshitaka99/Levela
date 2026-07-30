import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TELOP_FONT } from "../fonts";
import { COLORS } from "../theme";
import { beatPulse } from "../timing";

/** Small tilted stamp that slams in over the top of the frame. */
export const Badge: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = spring({
    frame: frame - at,
    fps,
    config: { damping: 9, mass: 0.5, stiffness: 220 },
    durationInFrames: 20,
  });
  if (entry <= 0.0001) return null;

  const scale = interpolate(entry, [0, 1], [2.6, 1]) + beatPulse(frame) * 0.03;

  return (
    <div
      style={{
        position: "absolute",
        top: 132,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: Math.min(1, entry * 2.2),
      }}
    >
      <div
        style={{
          fontFamily: TELOP_FONT,
          fontWeight: 900,
          fontSize: 62,
          letterSpacing: 8,
          color: COLORS.ink,
          background: `linear-gradient(180deg, ${COLORS.gold}, #ffae00)`,
          padding: "14px 38px 18px",
          border: `8px solid ${COLORS.ink}`,
          borderRadius: 14,
          boxShadow: `14px 14px 0 rgba(0,0,0,0.45)`,
          transform: `rotate(-4deg) scale(${scale})`,
        }}
      >
        {text}
      </div>
    </div>
  );
};
