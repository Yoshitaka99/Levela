import React from "react";
import { AbsoluteFill } from "remotion";
import { s } from "../theme";
import { Blackout, Flash, Grain, Vignette } from "../components/Atmosphere";
import { FootageTrack } from "../components/Footage";
import { RapidWords, TelopStack } from "../components/Telop";
import { NarrationTrackFor } from "../narration";

export const SCENE5_DURATION = s(35);

/**
 * ⑤ 今出せずに、いつ出す（2:14 - 2:49）
 * バトルロープ、打ち込み、走り、腕立て。カット割りを一番短くする。
 * 最後に完全な黒と無音を置いて⑥に渡す。
 */
export const Scene5Now: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000000" }}>
    <FootageTrack
      clips={[
        {
          id: "40248",
          from: 0,
          durationInFrames: s(13.6),
          startFromSec: 2,
          zoom: [1.06, 1.16],
          grade: { mono: 0.95, brightness: 0.78, contrast: 1.132 },
          fade: 14,
        },
        {
          id: "52317",
          from: s(13),
          durationInFrames: s(9.6),
          startFromSec: 0.4,
          zoom: [1.04, 1.16],
          grade: { mono: 0.6, brightness: 1.02, contrast: 1.154 },
          fade: 10,
        },
        {
          id: "40968",
          from: s(22.2),
          durationInFrames: s(5.4),
          startFromSec: 1,
          zoom: [1.12, 1.02],
          grade: { mono: 0.5, brightness: 1.1, contrast: 1.165 },
          fade: 8,
        },
        {
          id: "32804",
          from: s(27.2),
          durationInFrames: s(6.6),
          startFromSec: 3,
          zoom: [1.04, 1.18],
          grade: { mono: 0.5, brightness: 1.02, contrast: 1.154 },
          fade: 10,
        },
      ]}
    />

    <NarrationTrackFor scene="05-now" highlight={["p3", "p8"]} />

    <Flash at={s(13.3)} length={7} max={0.95} />
    <TelopStack lines={[{ text: "今だ。", from: s(13.3), duration: s(2.3), size: 220 }]} />

    <Flash at={s(15.9)} length={4} max={0.5} />
    <RapidWords
      words={["今日の1本だ。", "今週の1件だ。", "今月の1位だ。"]}
      from={s(15.9)}
      hold={56}
      size={118}
      showRule={false}
    />

    <Flash at={s(22.3)} length={8} max={1} />
    <TelopStack
      gap={16}
      lines={[
        { text: "今、全力を出せずに、", from: s(22.3), duration: s(10.7), size: 128 },
        { text: "いつ 出す。", from: s(23.4), duration: s(9.6), size: 196 },
      ]}
    />

    <Vignette strength={0.72} />
    <Grain />

    {/* 台本の「完全な無音」。ここは何も足さない。 */}
    <Blackout from={s(33.4)} to={s(35)} fade={10} />
  </AbsoluteFill>
);
