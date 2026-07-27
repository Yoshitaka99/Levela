import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Flash, Grain, Vignette } from "../components/Atmosphere";
import { FootageTrack } from "../components/Footage";
import { RapidWords, TelopStack } from "../components/Telop";
import { NarrationTrackFor } from "../narration";

export const SCENE2_DURATION = s(41);

/**
 * ② なぜLevelaに来たのか（0:23 - 1:04）
 * ジムに入る、階段を駆け上がる、夜の街を走る。原点の画。
 * 最後の4語で初めてテンポが上がる。
 */
export const Scene2Why: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <FootageTrack
      clips={[
        {
          id: "23193",
          from: 0,
          durationInFrames: s(13),
          startFromSec: 4,
          zoom: [1.04, 1.14],
          grade: { mono: 1, brightness: 0.82, contrast: 1.121 },
          fade: 16,
        },
        {
          id: "40758",
          from: s(12.4),
          durationInFrames: s(7.6),
          startFromSec: 0.3,
          zoom: [1.1, 1.02],
          grade: { mono: 1, brightness: 0.9, contrast: 1.132 },
          fade: 14,
        },
        {
          id: "608",
          from: s(19.6),
          durationInFrames: s(12),
          startFromSec: 2,
          zoom: [1.06, 1.16],
          grade: { mono: 1, brightness: 0.86, contrast: 1.132 },
          fade: 14,
        },
        {
          id: "32804",
          from: s(31.2),
          durationInFrames: s(9.8),
          startFromSec: 1,
          zoom: [1.14, 1.04],
          grade: { mono: 0.85, brightness: 0.98, contrast: 1.137 },
          fade: 12,
        },
      ]}
    />

    <TelopStack
      lines={[
        { text: "思い出せ。", from: s(0.9), duration: s(5.6), size: 104 },
        { text: "なぜ、Levelaに来た。", from: s(2.1), duration: s(4.4), size: 140 },
      ]}
    />

    <NarrationTrackFor scene="02-why" highlight={["w3", "w4", "w7"]} />

    <Flash at={s(32.6)} length={5} max={0.6} />
    <RapidWords
      words={["変わりたかった", "勝ちたかった", "稼ぎたかった", "認められたかった"]}
      from={s(32.7)}
      hold={52}
      size={104}
    />

    <Vignette strength={0.72} />
    <Grain />
  </AbsoluteFill>
);
