import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Grain, Heartbeat, Vignette } from "../components/Atmosphere";
import { FootageTrack } from "../components/Footage";
import { TelopStack } from "../components/Telop";
import { NarrationTrackFor } from "../narration";

export const SCENE1_DURATION = s(23);

/**
 * ① 沈黙と問い（0:00 - 0:23）
 * 手にバンテージを巻く手元と、誰もいないオフィス。
 * 音は無音に近いところから始めて、間で持たせる。
 */
export const Scene1Question: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <FootageTrack
      clips={[
        {
          id: "4596",
          from: 0,
          durationInFrames: s(12),
          startFromSec: 3,
          zoom: [1.05, 1.14],
          grade: { mono: 1, brightness: 0.78, contrast: 1.137 },
          fade: 18,
        },
        {
          id: "914",
          from: s(11.4),
          durationInFrames: s(11.6),
          startFromSec: 2,
          zoom: [1.12, 1.02],
          grade: { mono: 1, brightness: 0.7, contrast: 1.11 },
          fade: 18,
        },
      ]}
    />

    <Heartbeat at={0} />

    <TelopStack
      lines={[
        { text: "今日、", from: s(1.4), duration: s(5.6), size: 108 },
        { text: "あなたは何本 取ったか。", from: s(2.4), duration: s(4.6), size: 132 },
      ]}
    />

    <NarrationTrackFor scene="01-question" highlight={["q4"]} />

    <Vignette strength={0.72} />
    <Grain />
  </AbsoluteFill>
);
