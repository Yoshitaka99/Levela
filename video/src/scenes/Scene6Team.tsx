import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Flash, Vignette } from "../components/Atmosphere";
import { EndCard } from "../components/EndCard";
import { FootageTrack } from "../components/Footage";
import { TelopStack } from "../components/Telop";
import { NarrationTrackFor } from "../narration";

export const SCENE6_DURATION = s(22);

/**
 * ⑥ オロチームのコール（2:49 - 3:11）
 * ここだけモノクロを解いてカラーに戻す。静かな確信のトーンで着地する。
 */
export const Scene6Team: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <FootageTrack
      clips={[
        {
          id: "21225",
          from: 0,
          durationInFrames: s(9),
          startFromSec: 1,
          zoom: [1.05, 1.14],
          grade: { mono: 0.15, brightness: 0.94, contrast: 1.088 },
          fade: 16,
        },
        {
          id: "34980",
          from: s(8.4),
          durationInFrames: s(7),
          startFromSec: 4,
          zoom: [1.12, 1.02],
          grade: { mono: 0, brightness: 1.02, contrast: 1.077 },
          fade: 16,
        },
      ]}
    />

    <NarrationTrackFor scene="06-team" highlight={["t2"]} />

    <TelopStack
      gap={14}
      lines={[
        { text: "数字で語る。", from: s(8.6), duration: s(6.2), size: 118 },
        { text: "数字で守る。", from: s(10.4), duration: s(4.4), size: 118 },
        { text: "数字で、勝つ。", from: s(12.2), duration: s(2.6), size: 118, color: COLOR.accent },
      ]}
    />

    <Flash at={s(15.2)} length={8} max={1} />
    <EndCard from={s(15.5)} />

    <Vignette strength={0.75} />
  </AbsoluteFill>
);
