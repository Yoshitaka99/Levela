import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  OffthreadVideo,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Badge } from "./components/Badge";
import {
  BeatSweep,
  Flash,
  Shockwave,
  Sparks,
  SpeedLines,
  Vignette,
} from "./components/Effects";
import { ImpactText } from "./components/ImpactText";
import { loadTelopFonts } from "./fonts";
import { GRADIENTS } from "./theme";
import { beatPulse, DROP, hitAmount, LINES } from "./timing";

loadTelopFonts();

export type HypeTelopProps = {
  videoSrc: string;
  bgmSrc: string;
  /** Volume of the original clip audio (voices etc.). */
  originalVolume: number;
  /** Volume of the synthesised hype BGM. */
  bgmVolume: number;
  badge: string;
};

export const hypeTelopDefaults: HypeTelopProps = {
  // Normalised H.264/SDR portrait render of the original iPhone clip – see
  // `npm run source`. The raw Dolby Vision HEVC .mov decodes far too slowly and
  // crashes the frame compositor under concurrency.
  videoSrc: "media/source-h264.mp4",
  bgmSrc: "audio/hype-bgm.wav",
  originalVolume: 0.55,
  bgmVolume: 0.72,
  badge: "気合い",
};

/**
 * Fixed-height slot for one telop line. Reserving the space up front means the
 * earlier lines never jump when a later line slams in.
 */
const TelopRow: React.FC<{ height: number; children: React.ReactNode }> = ({
  height,
  children,
}) => (
  <div
    style={{
      height,
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {children}
  </div>
);

/** Camera shake driven by the musical hits. */
const useShake = (frame: number) => {
  const amount = hitAmount(frame, 2.4);
  const strength = amount * 26;
  return {
    x: (random(`shx-${frame}`) - 0.5) * strength,
    y: (random(`shy-${frame}`) - 0.5) * strength,
    rotate: (random(`shr-${frame}`) - 0.5) * amount * 1.1,
    amount,
  };
};

export const HypeTelop: React.FC<HypeTelopProps> = ({
  videoSrc,
  bgmSrc,
  originalVolume,
  bgmVolume,
  badge,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const shake = useShake(frame);

  // Slow push-in, plus a snap zoom on every hit.
  const drift = interpolate(frame, [0, durationInFrames], [1.02, 1.09]);
  const zoom = drift + shake.amount * 0.05 + beatPulse(frame) * 0.006;

  // Punchier grade the moment the drop lands.
  const grade = [
    `saturate(${1.05 + shake.amount * 0.35})`,
    `contrast(${1.06 + shake.amount * 0.12})`,
    `brightness(${1 + shake.amount * 0.06})`,
  ].join(" ");

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${zoom}) translate(${shake.x}px, ${shake.y}px) rotate(${shake.rotate}deg)`,
          filter: grade,
        }}
      >
        <OffthreadVideo
          src={staticFile(videoSrc)}
          volume={originalVolume}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      <Vignette />
      <BeatSweep />

      {/* Impact garnish, all locked to the same frames as the music. */}
      <SpeedLines at={DROP} />
      <SpeedLines at={LINES[2].at} count={54} opacity={0.62} />
      <Shockwave at={DROP} x={width / 2} y={height * 0.62} />
      <Shockwave
        at={LINES[2].at}
        x={width / 2}
        y={height * 0.62}
        color="#ffd60a"
        size={2600}
      />
      <Sparks at={LINES[2].at} />
      <Flash />

      <Badge text={badge} at={6} />

      {/* Telop stack: the three lines stay on screen and build into the full copy.
          Each row keeps a fixed height so nothing reflows as lines appear. */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: height * 0.13,
          transform: `translate(${shake.x * 0.5}px, ${shake.y * 0.5}px)`,
        }}
      >
        <TelopRow height={158}>
          <ImpactText
            text={LINES[0].text}
            at={LINES[0].at}
            fontSize={150}
            gradient={GRADIENTS.paper}
            stroke={17}
            pulse={0.03}
            glow="rgba(34, 227, 255, 0.45)"
          />
        </TelopRow>
        <TelopRow height={190}>
          <ImpactText
            text={LINES[1].text}
            at={LINES[1].at}
            fontSize={186}
            gradient={GRADIENTS.gold}
            stroke={19}
            stagger={1.2}
            pulse={0.05}
          />
        </TelopRow>
        <TelopRow height={202}>
          <ImpactText
            text={LINES[2].text}
            at={LINES[2].at}
            fontSize={196}
            gradient={GRADIENTS.fire}
            stroke={21}
            stagger={1}
            pulse={0.075}
            glow="rgba(255, 45, 45, 0.7)"
          />
        </TelopRow>
      </AbsoluteFill>

      <Audio src={staticFile(bgmSrc)} volume={bgmVolume} />
    </AbsoluteFill>
  );
};
