import React from "react";
import { Composition } from "remotion";
import { FPS } from "./theme";
import { MINUTE_DURATION, OrochiMinute, minuteDefaultProps } from "./OrochiMinute";
import {
  MOTIVATION_DURATION,
  OrochiMotivation,
  motivationDefaultProps,
} from "./OrochiMotivation";

export const RemotionRoot: React.FC = () => (
  <>
    {/* 本編 1:03 — 朝礼・キックオフ・Slack共有。これがメイン */}
    <Composition
      id="OrochiMotivation"
      component={OrochiMinute}
      durationInFrames={MINUTE_DURATION}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={minuteDefaultProps}
    />

    {/* 縦型 1:03 — スマホ／ストーリーズ用 */}
    <Composition
      id="OrochiMotivationVertical"
      component={OrochiMinute}
      durationInFrames={MINUTE_DURATION}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={minuteDefaultProps}
    />

    {/* 長尺 3:11 — 台本①〜⑥をすべて読む版。研修やオンボーディング向け */}
    <Composition
      id="OrochiMotivationLong"
      component={OrochiMotivation}
      durationInFrames={MOTIVATION_DURATION}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={motivationDefaultProps}
    />
  </>
);
