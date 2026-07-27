import React from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { COLOR } from "../theme";

/** カラーグレード。前半はモノクロで沈め、後半にかけて色と明るさを戻す。 */
export type Grade = {
  /** 0 = フルカラー, 1 = モノクロ */
  mono?: number;
  /** 素材の明るさ。文字を乗せるので基本は暗く落とす */
  brightness?: number;
  contrast?: number;
};

export type ClipProps = {
  /** public/footage 以下のファイル名（拡張子なし） */
  id: string;
  /** シーン先頭からの表示開始フレーム */
  from: number;
  durationInFrames: number;
  /** 素材の頭出し（秒） */
  startFromSec?: number;
  /** ゆっくりズーム。[開始倍率, 終了倍率] */
  zoom?: [number, number];
  /** 横方向のゆっくりパン（px） */
  panX?: [number, number];
  grade?: Grade;
  /** 前後のフェード長 */
  fade?: number;
};

const FootageClip: React.FC<Omit<ClipProps, "from">> = ({
  id,
  durationInFrames,
  startFromSec = 0,
  zoom = [1.08, 1.16],
  panX = [0, 0],
  grade = {},
  fade = 10,
}) => {
  const frame = useCurrentFrame();
  const { mono = 1, brightness = 0.85, contrast = 1.12 } = grade;

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });
  const scale = interpolate(progress, [0, 1], zoom);
  const x = interpolate(progress, [0, 1], panX);
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translateX(${x}px)`,
          filter: `grayscale(${mono}) brightness(${brightness}) contrast(${contrast})`,
        }}
      >
        <OffthreadVideo
          src={staticFile(`footage/${id}.mp4`)}
          startFrom={Math.round(startFromSec * 30)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * シーンの背景になる映像トラック。
 * クリップは重ならないよう順に並べる前提で、前後をフェードでつなぐ。
 */
export const FootageTrack: React.FC<{ clips: ClipProps[] }> = ({ clips }) => (
  <AbsoluteFill style={{ backgroundColor: "#000000" }}>
    {clips.map((clip) => (
      <Sequence
        key={`${clip.id}-${clip.from}`}
        from={clip.from}
        durationInFrames={clip.durationInFrames}
        name={`footage:${clip.id}`}
        layout="none"
      >
        <FootageClip {...clip} />
      </Sequence>
    ))}
    {/* 文字を読ませるための沈め。素材そのものは見えるまま、上下だけ濃く落とす。 */}
    <AbsoluteFill
      style={{
        background: `linear-gradient(to bottom, rgba(5,6,10,0.72) 0%, rgba(5,6,10,0.12) 30%, rgba(5,6,10,0.18) 58%, rgba(5,6,10,0.82) 100%)`,
        pointerEvents: "none",
      }}
    />
    <AbsoluteFill style={{ backgroundColor: COLOR.bg, opacity: 0.08, pointerEvents: "none" }} />
  </AbsoluteFill>
);
