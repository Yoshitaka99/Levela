import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { COLOR, FONT_FACE_CSS, baseStyle, s } from "./theme";
import { Blackout, Flash, Grain, Heartbeat, Vignette } from "./components/Atmosphere";
import { Bgm, type BgmPlan } from "./components/Bgm";
import { FootageTrack } from "./components/Footage";
import { Grid, KpiBoard } from "./components/Kpi";
import { EndCard } from "./components/EndCard";
import { RapidWords, TelopStack } from "./components/Telop";
import { NarrationTrackFor } from "./narration";

export type MinuteProps = {
  /** 差し替え用。public/ からの相対パス。空文字なら同梱のBGMプランを使う。 */
  bgm: string;
  bgmVolume: number;
};

export const minuteDefaultProps: MinuteProps = { bgm: "", bgmVolume: 0.75 };

/** 本編 1:03。曲の尺（66秒）と、その盛り上がりの位置に合わせてある。 */
export const MINUTE_DURATION = s(63);

/**
 * BGMは曲そのものが 0→30秒で立ち上がり、40〜56秒がピーク、58秒から解決する。
 * こちらのカーブは、その上で頭を沈めてナレーションを通すためのもの。
 */
const BGM_PLAN: BgmPlan[] = [
  {
    file: "main.mp3",
    fromSec: 0,
    durationSec: 63,
    volume: [
      [0, 0],
      [1.5, 0.34],
      [9, 0.4],
      [20, 0.5],
      [31, 0.6],
      [39, 0.72],
      [48, 0.82],
      [56, 0.78],
      [63, 0.5],
    ],
  },
];

export const OrochiMinute: React.FC<MinuteProps> = ({ bgm, bgmVolume }) => (
  <AbsoluteFill style={{ ...baseStyle, backgroundColor: COLOR.bg }}>
    <style>{FONT_FACE_CSS}</style>
    {bgm ? <Audio src={staticFile(bgm)} volume={bgmVolume} /> : <Bgm plan={BGM_PLAN} />}

    <FootageTrack
      clips={[
        // ① 問い
        {
          id: "4596",
          from: 0,
          durationInFrames: s(9.8),
          startFromSec: 3,
          zoom: [1.05, 1.14],
          grade: { mono: 1, brightness: 0.78, contrast: 1.14 },
          fade: 14,
        },
        // ② 原点
        {
          id: "23193",
          from: s(9.2),
          durationInFrames: s(6.4),
          startFromSec: 4,
          zoom: [1.04, 1.13],
          grade: { mono: 1, brightness: 0.82, contrast: 1.12 },
          fade: 12,
        },
        {
          id: "40758",
          from: s(15.2),
          durationInFrames: s(5),
          startFromSec: 0.3,
          zoom: [1.1, 1.02],
          grade: { mono: 1, brightness: 0.9, contrast: 1.13 },
          fade: 10,
        },
        // ③ 数字
        {
          id: "4907",
          from: s(19.8),
          durationInFrames: s(5.6),
          startFromSec: 2,
          zoom: [1.06, 1.15],
          grade: { mono: 1, brightness: 0.62, contrast: 1.13 },
          fade: 12,
        },
        {
          id: "241",
          from: s(25),
          durationInFrames: s(6.4),
          startFromSec: 1.5,
          zoom: [1.04, 1.15],
          grade: { mono: 0.9, brightness: 0.62, contrast: 1.13 },
          fade: 12,
        },
        // ④ 迷い
        {
          id: "40962",
          from: s(31),
          durationInFrames: s(5),
          startFromSec: 0,
          zoom: [1.05, 1.14],
          grade: { mono: 1, brightness: 0.8, contrast: 1.12 },
          fade: 10,
        },
        {
          id: "2846",
          from: s(35.6),
          durationInFrames: s(4.6),
          startFromSec: 3,
          zoom: [1.12, 1.02],
          grade: { mono: 1, brightness: 0.66, contrast: 1.1 },
          fade: 10,
        },
        // ⑤ 全力
        {
          id: "40248",
          from: s(39.8),
          durationInFrames: s(4.4),
          startFromSec: 2,
          zoom: [1.06, 1.15],
          grade: { mono: 0.9, brightness: 0.8, contrast: 1.13 },
          fade: 8,
        },
        {
          id: "52317",
          from: s(43.8),
          durationInFrames: s(4.4),
          startFromSec: 0.4,
          zoom: [1.04, 1.15],
          grade: { mono: 0.5, brightness: 1.02, contrast: 1.16 },
          fade: 8,
        },
        {
          id: "40968",
          from: s(47.8),
          durationInFrames: s(3.4),
          startFromSec: 1,
          zoom: [1.12, 1.02],
          grade: { mono: 0.4, brightness: 1.1, contrast: 1.17 },
          fade: 8,
        },
        {
          id: "32804",
          from: s(50.8),
          durationInFrames: s(4),
          startFromSec: 3,
          zoom: [1.04, 1.17],
          grade: { mono: 0.4, brightness: 1.02, contrast: 1.16 },
          fade: 8,
        },
        // ⑥ チーム
        {
          id: "21225",
          from: s(54.4),
          durationInFrames: s(4.6),
          startFromSec: 1,
          zoom: [1.05, 1.13],
          grade: { mono: 0.15, brightness: 0.94, contrast: 1.09 },
          fade: 10,
        },
        {
          id: "34980",
          from: s(58.6),
          durationInFrames: s(4.4),
          startFromSec: 4,
          zoom: [1.12, 1.02],
          grade: { mono: 0, brightness: 1.02, contrast: 1.08 },
          fade: 12,
        },
      ]}
    />

    <NarrationTrackFor scene="short" highlight={["s4", "s5", "s7", "s11"]} />

    {/* ① 問い */}
    <Sequence from={0} durationInFrames={s(9.2)} name="① 今日、何本取ったか">
      <Heartbeat at={0} />
      <TelopStack
        lines={[{ text: "今日、何本取ったか。", from: s(0.7), duration: s(4.4), size: 132 }]}
      />
      <Grain />
    </Sequence>

    {/* ② 原点 */}
    <Sequence from={s(9.2)} durationInFrames={s(10.6)} name="② なぜLevelaに来た">
      <Flash at={0} length={5} max={0.55} />
      <TelopStack
        lines={[{ text: "なぜ、Levelaに来た。", from: s(0.2), duration: s(4.2), size: 140 }]}
      />
      <RapidWords
        words={["変わりたかった", "勝ちたかった", "認められたかった"]}
        from={s(5.6)}
        hold={30}
        size={96}
      />
      <Grain />
    </Sequence>

    {/* ③ 数字 */}
    <Sequence from={s(19.8)} durationInFrames={s(11.2)} name="③ 成約率・成約数">
      <Grid opacity={0.45} />
      <Flash at={0} length={5} max={0.55} />
      <TelopStack
        gap={12}
        lines={[
          { text: "成約率にこだわれ。", from: s(0.3), duration: s(5), size: 124 },
          { text: "成約数にこだわれ。", from: s(1.7), duration: s(3.6), size: 124 },
        ]}
      />
      <KpiBoard from={s(5.8)} duration={s(5.2)} rate={38.4} count={127} />
      <Grain />
    </Sequence>

    {/* ④ 迷い */}
    <Sequence from={s(31)} durationInFrames={s(8.8)} name="④ 一瞬の楽か一生の後悔か">
      <TelopStack
        gap={16}
        lines={[
          { text: "一瞬の楽か。", from: s(0.3), duration: s(4.4), size: 150, color: COLOR.accent },
          { text: "一生の後悔か。", from: s(1.5), duration: s(3.2), size: 150, color: COLOR.accent },
        ]}
      />
      <Blackout from={s(4.9)} to={s(5.5)} fade={4} />
      <Grain />
    </Sequence>

    {/* ⑤ 全力 */}
    <Sequence from={s(39.8)} durationInFrames={s(14.6)} name="⑤ 今出せずにいつ出す">
      <Flash at={0} length={8} max={1} />
      <TelopStack
        gap={16}
        lines={[
          { text: "今、全力を出せずに、", from: s(0.2), duration: s(6.6), size: 128 },
          { text: "いつ 出す。", from: s(1.2), duration: s(5.6), size: 196 },
        ]}
      />
      <Flash at={s(7.4)} length={6} max={0.8} />
      <RapidWords
        words={["今だ。", "今日の1本だ。"]}
        from={s(7.5)}
        hold={46}
        size={148}
        showRule={false}
      />
      <Grain />
    </Sequence>

    {/* ⑥ チーム */}
    <Sequence from={s(54.4)} durationInFrames={s(8.6)} name="⑥ オロチーム">
      <TelopStack
        lines={[{ text: "数字で、勝つ。", from: s(0.2), duration: s(3.2), size: 132, color: COLOR.accent }]}
      />
      <Flash at={s(3.6)} length={8} max={1} />
      <EndCard from={s(3.9)} />
    </Sequence>

    <Vignette strength={0.72} />
  </AbsoluteFill>
);
