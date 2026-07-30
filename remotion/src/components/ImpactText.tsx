import React from "react";
import { random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TELOP_FONT } from "../fonts";
import { COLORS, outline } from "../theme";
import { beatPulse, hitEnvelope } from "../timing";

type Props = {
  text: string;
  /** Frame on which the line slams in (should sit on a musical accent). */
  at: number;
  fontSize: number;
  /** CSS gradient used as the glyph fill. */
  gradient: string;
  /** Thickness of the black keyline around the glyphs. */
  stroke?: number;
  /** Per-character stagger in frames. */
  stagger?: number;
  /** How hard the line reacts to the beat after it has landed. */
  pulse?: number;
  glow?: string;
};

/**
 * A single telop line that punches in character by character, overshoots, then
 * keeps breathing on the beat. Rendered as three stacked layers per character:
 * chromatic ghosts, a black keyline, and the gradient fill on top.
 */
export const ImpactText: React.FC<Props> = ({
  text,
  at,
  fontSize,
  gradient,
  stroke = 16,
  stagger = 1.6,
  pulse = 0.05,
  glow = "rgba(255, 122, 0, 0.55)",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = [...text];

  const impact = hitEnvelope(frame, at, 3.2);
  const pulseAmount = beatPulse(frame) * pulse;
  const aberration = impact * 14;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        fontFamily: TELOP_FONT,
        fontWeight: 900,
        fontSize,
        lineHeight: 1,
        letterSpacing: -fontSize * 0.02,
        transform: `skewX(-5deg) scale(${1 + pulseAmount})`,
        willChange: "transform",
      }}
    >
      {chars.map((char, i) => {
        const entry = spring({
          frame: frame - at - i * stagger,
          fps,
          config: { damping: 11, mass: 0.62, stiffness: 190 },
          durationInFrames: 26,
        });

        if (entry <= 0.0001) return null;

        // Each glyph flies in from a slightly different angle for a hand-made feel.
        const dir = random(`dir-${text}-${i}`) > 0.5 ? 1 : -1;
        const scale = 2.5 - 1.5 * entry;
        const y = (1 - entry) * 70;
        const rotate = (1 - entry) * 13 * dir;
        const blur = (1 - entry) * 9;

        const layer = (extra: React.CSSProperties): React.CSSProperties => ({
          position: "absolute",
          left: 0,
          top: 0,
          whiteSpace: "pre",
          ...extra,
        });

        return (
          <span
            key={`${char}-${i}`}
            style={{
              position: "relative",
              display: "inline-block",
              whiteSpace: "pre",
              opacity: Math.min(1, entry * 2.4),
              filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
              transform: `translateY(${y}px) scale(${scale}) rotate(${rotate}deg)`,
              transformOrigin: "50% 80%",
            }}
          >
            {/* chromatic ghosts – only visible during the impact frames */}
            {aberration > 0.4 ? (
              <>
                <span
                  aria-hidden
                  style={layer({
                    color: COLORS.hot,
                    transform: `translateX(${-aberration}px)`,
                    mixBlendMode: "screen",
                  })}
                >
                  {char}
                </span>
                <span
                  aria-hidden
                  style={layer({
                    color: COLORS.cyan,
                    transform: `translateX(${aberration}px)`,
                    mixBlendMode: "screen",
                  })}
                >
                  {char}
                </span>
              </>
            ) : null}

            {/* black keyline + glow behind the fill */}
            <span
              aria-hidden
              style={layer({
                color: COLORS.ink,
                WebkitTextStroke: `${stroke}px ${COLORS.ink}`,
                textShadow: `${outline(Math.round(stroke * 0.45))}, 0 ${
                  fontSize * 0.06
                }px ${fontSize * 0.12}px rgba(0,0,0,0.55), 0 0 ${
                  26 + impact * 60
                }px ${glow}`,
              })}
            >
              {char}
            </span>

            {/* gradient fill */}
            <span
              style={{
                position: "relative",
                backgroundImage: gradient,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                whiteSpace: "pre",
              }}
            >
              {char}
            </span>
          </span>
        );
      })}
    </div>
  );
};
