import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { COLOR, FONT_FACE_CSS, baseStyle, s } from "./theme";
import { Flash, Grain, Heartbeat, Vignette } from "./components/Atmosphere";
import { Bgm, type BgmPlan } from "./components/Bgm";
import { FootageTrack } from "./components/Footage";
import { Grid } from "./components/Kpi";
import { EndCard } from "./components/EndCard";
import { TelopStack } from "./components/Telop";
import { NarrationTrackFor } from "./narration";
import type { MotivationProps } from "./OrochiMotivation";

/** ショート版 60秒（朝礼・Slack共有用）。台本 §3 のテーブルに対応。 */
export const SHORT_DURATION = s(60);

const SHORT_BGM: BgmPlan[] = [
  {
    file: "epic.mp3",
    fromSec: 0,
    durationSec: 60,
    startFromSec: 14,
    volume: [
      [0, 0],
      [4, 0.22],
      [20, 0.38],
      [38, 0.58],
      [50, 0.8],
      [56, 0.7],
      [60, 0],
    ],
  },
];

export const OrochiMotivationShort: React.FC<MotivationProps> = ({ bgm, bgmVolume }) => (
  <AbsoluteFill style={{ ...baseStyle, backgroundColor: COLOR.bg }}>
    <style>{FONT_FACE_CSS}</style>
    {bgm ? <Audio src={staticFile(bgm)} volume={bgmVolume} /> : <Bgm plan={SHORT_BGM} />}

    <FootageTrack
      clips={[
        {
          id: "4596",
          from: 0,
          durationInFrames: s(10.5),
          startFromSec: 3,
          zoom: [1.05, 1.14],
          grade: { mono: 1, brightness: 0.78, contrast: 1.137 },
          fade: 16,
        },
        {
          id: "23193",
          from: s(9.9),
          durationInFrames: s(10.7),
          startFromSec: 5,
          zoom: [1.04, 1.14],
          grade: { mono: 1, brightness: 0.82, contrast: 1.121 },
          fade: 14,
        },
        {
          id: "241",
          from: s(20),
          durationInFrames: s(12.6),
          startFromSec: 1.5,
          zoom: [1.04, 1.16],
          grade: { mono: 0.8, brightness: 0.86, contrast: 1.132 },
          fade: 14,
        },
        {
          id: "40964",
          from: s(32),
          durationInFrames: s(12.4),
          startFromSec: 0.3,
          zoom: [1.12, 1.02],
          grade: { mono: 1, brightness: 0.7, contrast: 1.132 },
          fade: 14,
        },
        {
          id: "52317",
          from: s(43.8),
          durationInFrames: s(10.4),
          startFromSec: 0.4,
          zoom: [1.04, 1.16],
          grade: { mono: 0.6, brightness: 1.02, contrast: 1.154 },
          fade: 10,
        },
        {
          id: "34980",
          from: s(53.6),
          durationInFrames: s(6.4),
          startFromSec: 4,
          zoom: [1.12, 1.02],
          grade: { mono: 0, brightness: 1.02, contrast: 1.077 },
          fade: 14,
        },
      ]}
    />

    <NarrationTrackFor scene="short" highlight={["s4", "s6", "s8"]} />

    <Sequence from={0} durationInFrames={s(10)} name="今日、何本取ったか">
      <Heartbeat at={0} />
      <TelopStack
        lines={[{ text: "今日、何本取ったか。", from: s(1.2), duration: s(4.6), size: 132 }]}
      />
      <Grain />
    </Sequence>

    <Sequence from={s(10)} durationInFrames={s(10)} name="なぜLevelaに来た">
      <Flash at={0} length={5} max={0.5} />
      <TelopStack
        lines={[{ text: "なぜ、Levelaに来た。", from: s(0.2), duration: s(4.6), size: 140 }]}
      />
      <Grain />
    </Sequence>

    <Sequence from={s(20)} durationInFrames={s(12)} name="成約率・成約数">
      <Grid opacity={0.45} />
      <Flash at={0} length={5} max={0.5} />
      <TelopStack
        gap={12}
        lines={[
          { text: "成約率にこだわれ。", from: s(0.6), duration: s(6.4), size: 124 },
          { text: "成約数にこだわれ。", from: s(2.2), duration: s(4.8), size: 124 },
        ]}
      />
      <Grain />
    </Sequence>

    <Sequence from={s(32)} durationInFrames={s(12)} name="一瞬の楽か一生の後悔か">
      <TelopStack
        gap={16}
        lines={[
          { text: "一瞬の楽か。", from: s(0.6), duration: s(6.4), size: 150, color: COLOR.accent },
          { text: "一生の後悔か。", from: s(2.2), duration: s(4.8), size: 150, color: COLOR.accent },
        ]}
      />
      <Grain />
    </Sequence>

    <Sequence from={s(44)} durationInFrames={s(10)} name="今出せずにいつ出す">
      <Flash at={0} length={8} max={1} />
      <TelopStack
        gap={16}
        lines={[
          { text: "今、全力を出せずに、", from: s(0.4), duration: s(9), size: 124 },
          { text: "いつ 出す。", from: s(1.4), duration: s(8), size: 190 },
        ]}
      />
      <Grain />
    </Sequence>

    <Sequence from={s(54)} durationInFrames={s(6)} name="オロチーム">
      <Flash at={0} length={8} max={1} />
      <EndCard from={s(0.4)} />
    </Sequence>

    <Vignette strength={0.72} />
  </AbsoluteFill>
);
