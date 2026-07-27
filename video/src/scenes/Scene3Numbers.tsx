import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Flash, Grain, ScanLines, Vignette } from "../components/Atmosphere";
import { Grid, KpiBoard } from "../components/Kpi";
import { NarrationTrack, TelopStack } from "../components/Telop";

/**
 * ③ 数字は嘘をつかない（0:55 - 1:25 / 30秒）
 * ここからカット割りを短くしてBPMを上げる。
 */
export const Scene3Numbers: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <Grid opacity={0.55} />

    <TelopStack
      gap={10}
      lines={[
        { text: "成約率に、こだわれ。", from: s(0.7), duration: s(7.6), size: 128 },
        { text: "成約数に、こだわれ。", from: s(2.3), duration: s(6), size: 128 },
      ]}
    />

    <KpiBoard from={s(9.3)} duration={s(9.5)} rate={38.4} count={127} />

    <NarrationTrack
      lines={[
        { text: "「頑張ってます」は、数字じゃない。", from: s(10), duration: s(3.6) },
        { text: "「忙しいです」も、数字じゃない。", from: s(14), duration: s(3.6) },
        {
          text: "残るのは、成約率と、成約数だけだ。",
          from: s(18.2),
          duration: s(4.4),
          color: COLOR.fg,
        },
      ]}
    />

    <Flash at={s(23.3)} length={5} max={0.5} />
    <TelopStack
      gap={12}
      lines={[
        { text: "1%の差は、才能じゃない。", from: s(23.3), duration: s(6.5), size: 96 },
        {
          text: "準備の差だ。ロープレの差だ。執念の差だ。",
          from: s(24.6),
          duration: s(5.2),
          size: 62,
          weight: 700,
          color: COLOR.sub,
        },
        { text: "あと1本。", from: s(26.6), duration: s(3.2), size: 152, color: COLOR.accent },
      ]}
    />

    <ScanLines opacity={0.1} />
    <Vignette />
    <Grain />
  </AbsoluteFill>
);
