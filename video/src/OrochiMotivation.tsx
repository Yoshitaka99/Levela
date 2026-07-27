import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { COLOR, FONT_FACE_CSS, baseStyle, s } from "./theme";
import { Scene1Question } from "./scenes/Scene1Question";
import { Scene2Why } from "./scenes/Scene2Why";
import { Scene3Numbers } from "./scenes/Scene3Numbers";
import { Scene4Regret } from "./scenes/Scene4Regret";
import { Scene5Now } from "./scenes/Scene5Now";
import { Scene6Team } from "./scenes/Scene6Team";

export type MotivationProps = {
  /** public/ からの相対パス。空文字ならBGMなしで書き出す。 */
  bgm: string;
  bgmVolume: number;
};

export const motivationDefaultProps: MotivationProps = {
  bgm: "",
  bgmVolume: 0.75,
};

/** 台本のブロック構成。合計 4800 フレーム = 160秒 = 2:40 */
export const SCENES = [
  { id: "01-question", Component: Scene1Question, duration: s(20) },
  { id: "02-why", Component: Scene2Why, duration: s(35) },
  { id: "03-numbers", Component: Scene3Numbers, duration: s(30) },
  { id: "04-regret", Component: Scene4Regret, duration: s(25) },
  { id: "05-now", Component: Scene5Now, duration: s(30) },
  { id: "06-team", Component: Scene6Team, duration: s(20) },
] as const;

export const MOTIVATION_DURATION = SCENES.reduce((acc, scene) => acc + scene.duration, 0);

export const OrochiMotivation: React.FC<MotivationProps> = ({ bgm, bgmVolume }) => {
  let cursor = 0;

  return (
    <AbsoluteFill style={{ ...baseStyle, backgroundColor: COLOR.bg }}>
      <style>{FONT_FACE_CSS}</style>
      {bgm ? <Audio src={staticFile(bgm)} volume={bgmVolume} /> : null}

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
