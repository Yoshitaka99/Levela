import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { hitAmount } from "../timing";

/** White frame flash on every musical hit — the cheapest way to add punch. */
export const Flash: React.FC<{ strength?: number }> = ({ strength = 0.42 }) => {
  const frame = useCurrentFrame();
  const value = hitAmount(frame, 1.6);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        opacity: value * strength,
        mixBlendMode: "screen",
      }}
    />
  );
};

/** Expanding ring shockwave, one per hit frame passed in. */
export const Shockwave: React.FC<{
  at: number;
  x: number;
  y: number;
  color?: string;
  size?: number;
}> = ({ at, x, y, color = "white", size = 2200 }) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < 0 || local > 22) return null;

  const progress = local / 22;
  const scale = interpolate(progress, [0, 1], [0.05, 1], {
    easing: (t) => 1 - (1 - t) ** 3,
  });
  const opacity = interpolate(progress, [0, 0.15, 1], [0, 0.9, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: "50%",
        border: `${interpolate(progress, [0, 1], [26, 2])}px solid ${color}`,
        transform: `scale(${scale})`,
        opacity,
        mixBlendMode: "screen",
      }}
    />
  );
};

/** Manga-style radial speed lines that snap in on a hit and fade fast. */
export const SpeedLines: React.FC<{
  at: number;
  count?: number;
  opacity?: number;
}> = ({ at, count = 42, opacity = 0.55 }) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < 0 || local > 14) return null;
  const fade = interpolate(local, [0, 3, 14], [0, opacity, 0]);

  return (
    <AbsoluteFill style={{ opacity: fade, mixBlendMode: "screen" }}>
      {new Array(count).fill(0).map((_, i) => {
        const angle = (i / count) * 360 + random(`sl-${at}-${i}`) * 6;
        const length = 320 + random(`sll-${at}-${i}`) * 620;
        const push = interpolate(local, [0, 14], [340, 900]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: length,
              height: 3 + random(`slw-${at}-${i}`) * 7,
              background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${COLORS.paper} 100%)`,
              transformOrigin: "0% 50%",
              transform: `rotate(${angle}deg) translateX(${push}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Sparks that burst outward from the telop on the biggest hit. */
export const Sparks: React.FC<{ at: number; count?: number }> = ({
  at,
  count = 34,
}) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < 0 || local > 42) return null;

  return (
    <AbsoluteFill>
      {new Array(count).fill(0).map((_, i) => {
        const angle = random(`sp-a-${at}-${i}`) * Math.PI * 2;
        const speed = 14 + random(`sp-s-${at}-${i}`) * 30;
        const life = 24 + random(`sp-l-${at}-${i}`) * 18;
        if (local > life) return null;

        const t = local;
        const dist = speed * t * (1 - t / (life * 2.4));
        const size = 6 + random(`sp-z-${at}-${i}`) * 12;
        const color = [COLORS.gold, COLORS.ember, COLORS.paper][i % 3];

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "62%",
              width: size,
              height: size * (1.6 + random(`sp-r-${at}-${i}`)),
              borderRadius: size,
              background: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              opacity: interpolate(t, [0, life * 0.3, life], [1, 0.9, 0]),
              transform: [
                `translate(${Math.cos(angle) * dist}px, ${
                  Math.sin(angle) * dist + t * t * 0.28
                }px)`,
                `rotate(${angle * 57.3}deg)`,
              ].join(" "),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Darkens the edges so white text never fights a bright background. */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(120% 78% at 50% 42%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.34) 74%, rgba(0,0,0,0.62) 100%)",
    }}
  />
);

/**
 * Diagonal colour sweep that rides the beat — keeps the frame feeling alive
 * during the long hold after the last telop line.
 */
export const BeatSweep: React.FC = () => {
  const frame = useCurrentFrame();
  const cycle = (frame % 48) / 48;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${115}deg, rgba(255,45,45,0) 35%, rgba(255,122,0,0.22) 50%, rgba(255,214,10,0) 65%)`,
        transform: `translateX(${interpolate(cycle, [0, 1], [-1400, 1400])}px)`,
        mixBlendMode: "screen",
        opacity: 0.7,
      }}
    />
  );
};
