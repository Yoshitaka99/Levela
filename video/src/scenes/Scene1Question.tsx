import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Grain, Heartbeat, Vignette } from "../components/Atmosphere";
import { NarrationTrack, TelopStack } from "../components/Telop";

/**
 * ① 沈黙と問い（0:00 - 0:20）
 * 無音から入る。テロップ2行だけを置いて、あとは間で持たせる。
 */
export const Scene1Question: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <Heartbeat at={0} />

    <TelopStack
      lines={[
        { text: "今日、", from: s(1), duration: s(6.3), size: 108 },
        { text: "あなたは何本 取ったか。", from: s(2), duration: s(5.3), size: 132 },
      ]}
    />

    <NarrationTrack
      lines={[
        { text: "数字は、覚えている。", from: s(8), duration: s(3) },
        { text: "あなたが、あの日どれだけやったか。", from: s(11.6), duration: s(4) },
        { text: "……そして、どれだけ逃げたかも。", from: s(16.2), duration: s(3.8), color: COLOR.fg },
      ]}
    />

    <Vignette />
    <Grain />
  </AbsoluteFill>
);
