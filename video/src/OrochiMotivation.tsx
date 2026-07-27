import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { COLOR, FONT_FACE_CSS, baseStyle } from "./theme";
import { Bgm, type BgmPlan } from "./components/Bgm";
import { SCENE1_DURATION, Scene1Question } from "./scenes/Scene1Question";
import { SCENE2_DURATION, Scene2Why } from "./scenes/Scene2Why";
import { SCENE3_DURATION, Scene3Numbers } from "./scenes/Scene3Numbers";
import { SCENE4_DURATION, Scene4Regret } from "./scenes/Scene4Regret";
import { SCENE5_DURATION, Scene5Now } from "./scenes/Scene5Now";
import { SCENE6_DURATION, Scene6Team } from "./scenes/Scene6Team";

export type MotivationProps = {
  /** 差し替え用。public/ からの相対パス。空文字なら同梱のBGMプランを使う。 */
  bgm: string;
  bgmVolume: number;
};

export const motivationDefaultProps: MotivationProps = {
  bgm: "",
  bgmVolume: 0.75,
};

/** 台本のブロック構成。尺はナレーションの実長から決めている。 */
export const SCENES = [
  { id: "01-question", Component: Scene1Question, duration: SCENE1_DURATION },
  { id: "02-why", Component: Scene2Why, duration: SCENE2_DURATION },
  { id: "03-numbers", Component: Scene3Numbers, duration: SCENE3_DURATION },
  { id: "04-regret", Component: Scene4Regret, duration: SCENE4_DURATION },
  { id: "05-now", Component: Scene5Now, duration: SCENE5_DURATION },
  { id: "06-team", Component: Scene6Team, duration: SCENE6_DURATION },
] as const;

export const MOTIVATION_DURATION = SCENES.reduce((acc, scene) => acc + scene.duration, 0);

/**
 * 静かなアンビエントで入って、③の頭でオーケストラに受け渡し、
 * そこから最後まで音量を上げ続ける。⑤末尾の無音だけ一度落とす。
 * 秒数は各トラックの開始点からの相対値。
 */
const BGM_PLAN: BgmPlan[] = [
  {
    file: "bed.mp3",
    fromSec: 0,
    durationSec: 68,
    volume: [
      [0, 0],
      [7, 0.2],
      [40, 0.32],
      [60, 0.4],
      [68, 0],
    ],
  },
  {
    file: "epic.mp3",
    fromSec: 60,
    durationSec: 131,
    startFromSec: 2,
    volume: [
      [0, 0],
      [6, 0.24],
      [40, 0.4],
      [72, 0.62],
      [100, 0.8],
      [106.5, 0.85],
      [107.5, 0.06],
      [109, 0.06],
      [111, 0.7],
      [122, 0.8],
      [128, 0.6],
      [131, 0],
    ],
  },
];

export const OrochiMotivation: React.FC<MotivationProps> = ({ bgm, bgmVolume }) => {
  let cursor = 0;

  return (
    <AbsoluteFill style={{ ...baseStyle, backgroundColor: COLOR.bg }}>
      <style>{FONT_FACE_CSS}</style>

      {bgm ? (
        <Audio src={staticFile(bgm)} volume={bgmVolume} />
      ) : (
        <Bgm plan={BGM_PLAN} />
      )}

      {SCENES.map((scene) => {
        const from = cursor;
        cursor += scene.duration;
        return (
          <Sequence
            key={scene.id}
            name={scene.id}
            from={from}
            durationInFrames={scene.duration}
          >
            <scene.Component />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
