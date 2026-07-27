import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Blackout, Flash, Grain, Vignette } from "../components/Atmosphere";
import { NarrationTrack, RapidWords, TelopStack } from "../components/Telop";

/**
 * ⑤ 今出せずに、いつ出す（1:55 - 2:20 / 30秒）
 * 最大の畳みかけ。最後に完全な無音・黒を置いて⑥に渡す。
 */
export const Scene5Now: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <NarrationTrack
      lines={[
        { text: "準備ができたら、じゃない。", from: s(0.7), duration: s(3) },
        { text: "自信がついたら、でもない。", from: s(4), duration: s(3) },
        {
          text: "環境が整ったら？ ——一生整わない。",
          from: s(7.3),
          duration: s(3.7),
          color: COLOR.fg,
        },
      ]}
    />

    <Flash at={s(11.7)} length={7} max={0.95} />
    <TelopStack lines={[{ text: "今だ。", from: s(11.7), duration: s(2.4), size: 220 }]} />

    <Flash at={s(14.3)} length={4} max={0.5} />
    <RapidWords
      words={["今日の1本だ。", "今週の1件だ。", "今月の1位だ。"]}
      from={s(14.3)}
      hold={40}
      size={118}
      showRule={false}
    />

    <Flash at={s(19)} length={8} max={1} />
    <TelopStack
      gap={16}
      lines={[
        { text: "今、全力を出せずに、", from: s(19), duration: s(8), size: 128 },
        { text: "いつ 出す。", from: s(20), duration: s(7), size: 196 },
      ]}
    />

    <NarrationTrack
      lines={[
        { text: "ここで出せない全力に、", from: s(22), duration: s(2.4) },
        { text: "出番なんて一生こない。", from: s(24.4), duration: s(2.4), color: COLOR.fg },
      ]}
    />

    <Vignette />
    <Grain />

    {/* 台本の「1.5秒の完全無音」。ここは何も足さない。 */}
    <Blackout from={s(27.2)} to={s(30)} fade={8} />
  </AbsoluteFill>
);
