import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Flash, Grain, Vignette } from "../components/Atmosphere";
import { NarrationTrack, RapidWords, TelopStack } from "../components/Telop";

/**
 * ② なぜLevelaに来たのか（0:20 - 0:55 / 35秒）
 * 原点回帰。最後に4語で畳みかける。
 */
export const Scene2Why: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <TelopStack
      lines={[
        { text: "思い出せ。", from: s(0.7), duration: s(7), size: 104 },
        { text: "なぜ、Levelaに来た。", from: s(2), duration: s(5.7), size: 140 },
      ]}
    />

    <NarrationTrack
      lines={[
        { text: "楽をするために、ここに来たのか。", from: s(8.7), duration: s(4) },
        { text: "違うだろ。", from: s(13), duration: s(2.4), color: COLOR.fg, size: 54 },
        { text: "変わりたかったんだろ。", from: s(15.7), duration: s(3), color: COLOR.fg },
        { text: "「このままの自分で終わりたくない」", from: s(19.3), duration: s(3.4) },
        { text: "そう思ったから、ここに来たんだろ。", from: s(22.7), duration: s(3.4) },
        {
          text: "あの日のあなたは、今日のあなたを見て、何て言う。",
          from: s(26.7),
          duration: s(4.4),
          color: COLOR.fg,
        },
      ]}
    />

    <Flash at={s(31)} length={5} max={0.6} />
    <RapidWords
      words={["変わりたかった", "勝ちたかった", "稼ぎたかった", "認められたかった"]}
      from={s(31)}
      hold={28}
      size={104}
    />

    <Vignette />
    <Grain />
  </AbsoluteFill>
);
