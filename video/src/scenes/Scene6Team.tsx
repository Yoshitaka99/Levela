import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Flash, Vignette } from "../components/Atmosphere";
import { EndCard } from "../components/EndCard";
import { NarrationTrack, TelopStack } from "../components/Telop";

/**
 * ⑥ オロチームのコール（2:20 - 2:40 / 20秒）
 * グレイン無し・ヴィネット弱めで質感を変え、静かな確信のトーンで着地する。
 */
export const Scene6Team: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <NarrationTrack
      lines={[
        { text: "1人なら、折れる日もある。", from: s(1), duration: s(2.6) },
        { text: "だから、チームでやる。", from: s(4.2), duration: s(2.8), color: COLOR.fg },
      ]}
    />

    <TelopStack
      gap={14}
      lines={[
        { text: "数字で語る。", from: s(8.3), duration: s(5.7), size: 118 },
        { text: "数字で守る。", from: s(9.6), duration: s(4.4), size: 118 },
        { text: "数字で、勝つ。", from: s(10.9), duration: s(3.1), size: 118, color: COLOR.accent },
      ]}
    />

    <Flash at={s(14.3)} length={8} max={1} />
    <EndCard from={s(14.6)} />

    <Vignette strength={0.75} />
  </AbsoluteFill>
);
