import React from "react";
import { Composition } from "remotion";
import { FPS } from "./theme";
import {
  MOTIVATION_DURATION,
  OrochiMotivation,
  motivationDefaultProps,
} from "./OrochiMotivation";
import { OrochiMotivationShort, SHORT_DURATION } from "./OrochiMotivationShort";

export const RemotionRoot: React.FC = () => (
  <>
    {/* 本編 3:11 — 朝礼・月初キックオフ用 */}
    <Composition
      id="OrochiMotivation"
      component={OrochiMotivation}
      durationInFrames={MOTIVATION_DURATION}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={motivationDefaultProps}
    />

    {/* ショート 60秒 — Slack共有用 */}
    <Composition
      id="OrochiMotivationShort"
      component={OrochiMotivationShort}
      durationInFrames={SHORT_DURATION}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={motivationDefaultProps}
    />

    {/* ショート 縦型 60秒 — スマホ／ストーリーズ用 */}
    <Composition
      id="OrochiMotivationVertical"
      component={OrochiMotivationShort}
      durationInFrames={SHORT_DURATION}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={motivationDefaultProps}
    />
  </>
);
