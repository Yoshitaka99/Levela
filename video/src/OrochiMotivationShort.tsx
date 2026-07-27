import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { COLOR, FONT_FACE_CSS, baseStyle, s } from "./theme";
import { Flash, Grain, Heartbeat, Vignette } from "./components/Atmosphere";
import { NarrationTrack, TelopStack } from "./components/Telop";
import { Grid } from "./components/Kpi";
import { EndCard } from "./components/EndCard";
import type { MotivationProps } from "./OrochiMotivation";

/** ショート版 60秒（朝礼・Slack共有用）。台本 §3 のテーブルに対応。 */
export const SHORT_DURATION = s(60);

const Block: React.FC<{
  from: number;
  duration: number;
  name: string;
  children: React.ReactNode;
}> = ({ from, duration, name, children }) => (
  <Sequence from={from} durationInFrames={duration} name={name}>
    {children}
  </Sequence>
);

export const OrochiMotivationShort: React.FC<MotivationProps> = ({ bgm, bgmVolume }) => (
  <AbsoluteFill style={{ ...baseStyle, backgroundColor: COLOR.bg }}>
    <style>{FONT_FACE_CSS}</style>
    {bgm ? <Audio src={staticFile(bgm)} volume={bgmVolume} /> : null}

    <Block from={s(0)} duration={s(8)} name="今日、何本取ったか">
      <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
        <Heartbeat at={0} />
        <TelopStack
          lines={[{ text: "今日、何本取ったか。", from: s(0.7), duration: s(4.6), size: 132 }]}
        />
        <NarrationTrack lines={[{ text: "数字は、覚えている。", from: s(5), duration: s(2.8) }]} />
        <Vignette />
        <Grain />
      </AbsoluteFill>
    </Block>

    <Block from={s(8)} duration={s(12)} name="なぜLevelaに来た">
      <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
        <Flash at={0} length={5} max={0.5} />
        <TelopStack
          lines={[{ text: "なぜ、Levelaに来た。", from: s(0.5), duration: s(5.5), size: 140 }]}
        />
        <NarrationTrack
          lines={[
            { text: "楽をするために来たのか。違うだろ。", from: s(6.4), duration: s(2.6) },
            {
              text: "変わりたかったんだろ。",
              from: s(9.2),
              duration: s(2.6),
              color: COLOR.fg,
            },
          ]}
        />
        <Vignette />
        <Grain />
      </AbsoluteFill>
    </Block>

    <Block from={s(20)} duration={s(12)} name="成約率・成約数">
      <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
        <Grid opacity={0.5} />
        <Flash at={0} length={5} max={0.5} />
        <TelopStack
          gap={12}
          lines={[
            { text: "成約率にこだわれ。", from: s(0.5), duration: s(7.5), size: 124 },
            { text: "成約数にこだわれ。", from: s(1.6), duration: s(6.4), size: 124 },
          ]}
        />
        <NarrationTrack
          lines={[
            {
              text: "残るのは、成約率と、成約数だけだ。",
              from: s(8.4),
              duration: s(3.2),
              color: COLOR.fg,
            },
          ]}
        />
        <Vignette />
        <Grain />
      </AbsoluteFill>
    </Block>

    <Block from={s(32)} duration={s(12)} name="一瞬の楽か一生の後悔か">
      <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
        <TelopStack
          gap={16}
          lines={[
            { text: "一瞬の楽か。", from: s(0.6), duration: s(7.4), size: 150, color: COLOR.accent },
            {
              text: "一生の後悔か。",
              from: s(1.8),
              duration: s(6.2),
              size: 150,
              color: COLOR.accent,
            },
          ]}
        />
        <NarrationTrack
          lines={[
            {
              text: "「今日はいいか」を、何回繰り返してきた。",
              from: s(8.4),
              duration: s(3.2),
              color: COLOR.fg,
            },
          ]}
        />
        <Vignette />
        <Grain />
      </AbsoluteFill>
    </Block>

    <Block from={s(44)} duration={s(10)} name="今出せずにいつ出す">
      <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
        <Flash at={0} length={8} max={1} />
        <TelopStack
          gap={16}
          lines={[
            { text: "今、全力を出せずに、", from: s(0.5), duration: s(9), size: 124 },
            { text: "いつ 出す。", from: s(1.5), duration: s(8), size: 190 },
          ]}
        />
        <NarrationTrack lines={[{ text: "今だ。今日の1本だ。", from: s(6), duration: s(3.2) }]} />
        <Vignette />
        <Grain />
      </AbsoluteFill>
    </Block>

    <Block from={s(54)} duration={s(6)} name="オロチーム">
      <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
        <Flash at={0} length={8} max={1} />
        <EndCard from={s(0.3)} />
        <Vignette strength={0.75} />
      </AbsoluteFill>
    </Block>
  </AbsoluteFill>
);
