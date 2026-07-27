import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, useIsPortrait, useScale } from "../theme";

type Align = "left" | "center" | "right";

export type TelopProps = {
  text: string;
  /** このコンポーネントが属する Sequence 内での出現フレーム */
  from: number;
  /** 表示し続けるフレーム数。省略時は出っぱなし */
  duration?: number;
  /** 1920x1080 基準の px。他解像度では自動で拡縮される。 */
  size?: number;
  color?: string;
  weight?: 400 | 500 | 700 | 900;
  align?: Align;
  letterSpacing?: number;
  /** 左からのワイプで出すか */
  wipe?: boolean;
};

/**
 * 1行テロップ。
 * 下から少し上がりながら、ブラー抜け + 左からのワイプで出る。
 */
export const TelopLine: React.FC<TelopProps> = ({
  text,
  from,
  duration,
  size = 120,
  color = COLOR.fg,
  weight = 900,
  align = "center",
  letterSpacing = 0.02,
  wipe = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScale();
  const isPortrait = useIsPortrait();
  const local = frame - from;

  if (local < 0) return null;
  if (duration !== undefined && local > duration) return null;

  const enter = spring({ frame: local, fps, config: { damping: 200, mass: 0.6 } });
  const y = interpolate(enter, [0, 1], [46, 0]) * scale;
  const blur = interpolate(enter, [0, 1], [14, 0]);
  const wipeAmount = wipe
    ? interpolate(local, [0, 16], [100, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const fadeIn = interpolate(local, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut =
    duration === undefined
      ? 1
      : interpolate(local, [duration - 10, duration], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  return (
    <div
      style={{
        width: "100%",
        textAlign: align,
        fontSize: size * scale,
        fontWeight: weight,
        color,
        lineHeight: 1.28,
        letterSpacing: `${letterSpacing}em`,
        opacity: fadeIn * fadeOut,
        transform: `translateY(${y}px)`,
        filter: `blur(${blur}px)`,
        clipPath: `inset(-0.3em ${wipeAmount}% -0.3em 0)`,
        whiteSpace: isPortrait ? "normal" : "pre",
        wordBreak: "keep-all",
        // 映像の上に乗るので、地の明るさに負けないよう影を敷く
        textShadow: "0 0.04em 0.3em rgba(0,0,0,0.9), 0 0 0.9em rgba(0,0,0,0.65)",
      }}
    >
      {text}
    </div>
  );
};

/**
 * 画面中央のテロップスタック。
 * 「1画面1メッセージ」が原則なので、渡す行は 1〜3 行までに抑える。
 */
export const TelopStack: React.FC<{
  lines: TelopProps[];
  gap?: number;
  align?: Align;
  paddingX?: number;
}> = ({ lines, gap = 18, align = "center", paddingX = 140 }) => {
  const scale = useScale();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: align === "center" ? "center" : align === "left" ? "flex-start" : "flex-end",
        paddingLeft: paddingX * scale,
        paddingRight: paddingX * scale,
        gap: gap * scale,
      }}
    >
      {lines.map((line, i) => (
        <TelopLine key={`${line.text}-${i}`} align={align} {...line} />
      ))}
    </AbsoluteFill>
  );
};

/**
 * 短い語を高速で切り替える畳みかけ。
 * 台本②の「変わりたかった / 勝ちたかった / …」用。
 */
export const RapidWords: React.FC<{
  words: string[];
  from: number;
  /** 1語あたりの表示フレーム数 */
  hold: number;
  size?: number;
  color?: string;
  /** 進行を示す下部のインジケータを出すか */
  showRule?: boolean;
}> = ({ words, from, hold, size = 108, color = COLOR.fg, showRule = true }) => {
  const frame = useCurrentFrame();
  const scale = useScale();
  const local = frame - from;
  if (local < 0 || local >= hold * words.length) return null;

  const index = Math.floor(local / hold);
  const inner = local % hold;
  const word = words[index];

  const opacity = interpolate(inner, [0, 3, hold - 4, hold - 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = interpolate(inner, [0, hold], [1.06, 1.0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        gap: 34 * scale,
        paddingLeft: 100 * scale,
        paddingRight: 100 * scale,
      }}
    >
      <div
        style={{
          fontSize: size * scale,
          fontWeight: 900,
          color,
          opacity,
          transform: `scale(${zoom})`,
          letterSpacing: "0.04em",
          textAlign: "center",
          textShadow: "0 0.04em 0.3em rgba(0,0,0,0.9), 0 0 0.9em rgba(0,0,0,0.65)",
        }}
      >
        {word}
      </div>
      {showRule ? (
        <div style={{ display: "flex", gap: 14 * scale, opacity: 0.75 }}>
          {words.map((w, i) => (
            <div
              key={w}
              style={{
                width: 64 * scale,
                height: 3,
                backgroundColor: i <= index ? COLOR.fg : COLOR.line,
              }}
            />
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** ナレーション字幕。画面下部。テロップより弱く、読ませるための行。 */
export const Narration: React.FC<{
  text: string;
  from: number;
  duration: number;
  color?: string;
  size?: number;
}> = ({ text, from, duration, color = COLOR.sub, size = 44 }) => {
  const frame = useCurrentFrame();
  const scale = useScale();
  const local = frame - from;
  if (local < 0 || local > duration) return null;

  const opacity = interpolate(local, [0, 8, duration - 8, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(local, [0, 12], [12, 0], { extrapolateRight: "clamp" }) * scale;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 96 * scale,
        paddingLeft: 160 * scale,
        paddingRight: 160 * scale,
      }}
    >
      <div
        style={{
          fontSize: size * scale,
          fontWeight: 500,
          color,
          opacity,
          transform: `translateY(${y}px)`,
          textAlign: "center",
          lineHeight: 1.5,
          letterSpacing: "0.03em",
          textShadow: "0 0.05em 0.4em rgba(0,0,0,0.95)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** ナレーション字幕をまとめて置く。 */
export const NarrationTrack: React.FC<{
  lines: { text: string; from: number; duration: number; color?: string; size?: number }[];
}> = ({ lines }) => (
  <>
    {lines.map((line, i) => (
      <Narration key={`${line.text}-${i}`} {...line} />
    ))}
  </>
);
