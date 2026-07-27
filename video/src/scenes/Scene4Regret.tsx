import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Blackout, Grain, Vignette } from "../components/Atmosphere";
import { FootageTrack } from "../components/Footage";
import { RapidWords, TelopStack } from "../components/Telop";
import { NarrationTrackFor } from "../narration";

export const SCENE4_DURATION = s(33.5);

/**
 * ④ 一瞬の楽 vs 一生の後悔（1:40 - 2:14）
 * 座り込むボクサー、雨の窓、次のラウンドを待つ背中。
 * 「無下にするのか」の直後に1秒の完全な黒を挟む。
 */
export const Scene4Regret: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <FootageTrack
      clips={[
        {
          id: "40962",
          from: 0,
          durationInFrames: s(7.4),
          startFromSec: 0,
          zoom: [1.05, 1.14],
          grade: { mono: 1, brightness: 0.82, contrast: 1.121 },
          fade: 14,
        },
        {
          id: "2846",
          from: s(6.8),
          durationInFrames: s(7.6),
          startFromSec: 3,
          zoom: [1.12, 1.02],
          grade: { mono: 1, brightness: 0.66, contrast: 1.099 },
          fade: 16,
        },
        {
          id: "40964",
          from: s(13.8),
          durationInFrames: s(9.4),
          startFromSec: 0.3,
          zoom: [1.04, 1.14],
          grade: { mono: 1, brightness: 0.86, contrast: 1.132 },
          fade: 14,
        },
        {
          id: "40962",
          from: s(24),
          durationInFrames: s(9.5),
          startFromSec: 1.2,
          zoom: [1.16, 1.06],
          grade: { mono: 1, brightness: 0.61, contrast: 1.165 },
          fade: 16,
        },
      ]}
    />

    <RapidWords
      words={["疲れたから。", "今日はもういいか。", "明日やろう。"]}
      from={s(6.5)}
      hold={64}
      size={86}
      color={COLOR.sub}
      showRule={false}
    />

    <TelopStack
      gap={12}
      lines={[
        { text: "このチャンスを、", from: s(19.1), duration: s(4.4), size: 116 },
        { text: "無下にするのか。", from: s(20.1), duration: s(3.4), size: 148 },
      ]}
    />

    <Blackout from={s(23.2)} to={s(24.1)} fade={5} />

    <TelopStack
      gap={16}
      lines={[
        { text: "一瞬の楽か。", from: s(24.6), duration: s(8.9), size: 150, color: COLOR.accent },
        { text: "一生の後悔か。", from: s(26.4), duration: s(7.1), size: 150, color: COLOR.accent },
      ]}
    />

    <NarrationTrackFor scene="04-regret" highlight={["r3", "r6"]} />

    <Vignette strength={0.72} />
    <Grain />
  </AbsoluteFill>
);
