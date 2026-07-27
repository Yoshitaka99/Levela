import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, s } from "../theme";
import { Blackout, Grain, Vignette } from "../components/Atmosphere";
import { NarrationTrack, RapidWords, TelopStack } from "../components/Telop";

/**
 * ④ 一瞬の楽 vs 一生の後悔（1:25 - 1:55 / 25秒）
 * 「無下にするのか」で1秒の完全な黒を挟む。
 */
export const Scene4Regret: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
    <NarrationTrack
      lines={[
        {
          text: "今日、もう1件かけない理由を、何個作った。",
          from: s(0.7),
          duration: s(4.4),
          color: COLOR.fg,
        },
      ]}
    />

    <RapidWords
      words={["疲れたから。", "今日はもういいか。", "明日やろう。"]}
      from={s(5.3)}
      hold={38}
      size={86}
      color={COLOR.sub}
      showRule={false}
    />

    <NarrationTrack
      lines={[
        {
          text: "その「今日はいいか」を、何回繰り返してきた。",
          from: s(9.3),
          duration: s(3.8),
        },
      ]}
    />

    <TelopStack
      gap={12}
      lines={[
        { text: "このチャンスを、", from: s(13.6), duration: s(4.4), size: 116 },
        { text: "無下にするのか。", from: s(14.6), duration: s(3.4), size: 148 },
      ]}
    />

    <Blackout from={s(18.2)} to={s(19.2)} fade={5} />

    <NarrationTrack
      lines={[
        { text: "今の一瞬の楽のために、", from: s(19.5), duration: s(2.6) },
        {
          text: "一生後悔する側に、回るのか。",
          from: s(22.2),
          duration: s(3),
          color: COLOR.fg,
        },
      ]}
    />

    <TelopStack
      gap={16}
      lines={[
        { text: "一瞬の楽か。", from: s(20.3), duration: s(4.7), size: 150, color: COLOR.accent },
        { text: "一生の後悔か。", from: s(21.6), duration: s(3.4), size: 150, color: COLOR.accent },
      ]}
    />

    <Vignette />
    <Grain />
  </AbsoluteFill>
);
