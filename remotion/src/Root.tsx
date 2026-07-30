import React from "react";
import { Composition } from "remotion";
import { HypeTelop, hypeTelopDefaults } from "./HypeTelop";
import { DURATION_IN_FRAMES, FPS } from "./timing";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HypeTelop"
      component={HypeTelop}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={hypeTelopDefaults}
    />
  );
};
