import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Flash, Grain, ScanLines, Vignette } from "../components/Atmosphere";
import { FootageTrack } from "../components/Footage";
import { Grid, KpiBoard } from "../components/Kpi";
import { TelopStack } from "../components/Telop";
import { NarrationTrackFor } from "../narration";

export const SCENE3_DURATION = s(36.5);

/**
 * ③ 数字は嘘をつかない（1:04 - 1:40）
 * 手元・オフィス・契約書。ここからカット割りを短くしてBPMを上げる。
 */
export const Scene3Numbers: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <FootageTrack
      clips={[
        {
          id: "4907",
          from: 0,
          durationInFrames: s(9),
          startFromSec: 2,
          zoom: [1.06, 1.16],
          grade: { mono: 1, brightness: 0.62, contrast: 1.132 },
          fade: 14,
        },
        {
          id: "33429",
          from: s(8.4),
          durationInFrames: s(14.6),
          startFromSec: 1,
          zoom: [1.12, 1.02],
          grade: { mono: 1, brightness: 0.55, contrast: 1.11 },
          fade: 14,
        },
        {
          id: "241",
          from: s(22.6),
          durationInFrames: s(13.9),
          startFromSec: 1.5,
          zoom: [1.04, 1.16],
          grade: { mono: 0.9, brightness: 0.62, contrast: 1.132 },
          fade: 14,
        },
      ]}
    />
    <Grid opacity={0.45} />

    <TelopStack
      gap={10}
      lines={[
        { text: "成約率に、こだわれ。", from: s(0.9), duration: s(6.6), size: 128 },
        { text: "成約数に、こだわれ。", from: s(2.6), duration: s(4.9), size: 128 },
      ]}
    />

    <KpiBoard from={s(9)} duration={s(12.5)} rate={38.4} count={127} />

    <NarrationTrackFor scene="03-numbers" highlight={["n4"]} />

    <Flash at={s(23)} length={5} max={0.5} />
    <TelopStack
      gap={12}
      lines={[
        { text: "1%の差は、才能じゃない。", from: s(23), duration: s(8.5), size: 96 },
        {
          text: "準備の差だ。ロープレの差だ。執念の差だ。",
          from: s(25.4),
          duration: s(6.1),
          size: 62,
          weight: 700,
          color: COLOR.sub,
        },
        { text: "あと1本。", from: s(32.4), duration: s(4.1), size: 152, color: COLOR.accent },
      ]}
    />

    <ScanLines opacity={0.08} />
    <Vignette strength={0.72} />
    <Grain />
  </AbsoluteFill>
);
