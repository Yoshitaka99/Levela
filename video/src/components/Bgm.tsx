import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { s } from "../theme";

/** [秒, 音量] のキーポイントを線でつないで音量カーブにする。 */
const curve = (points: [number, number][]) => (frame: number) =>
  interpolate(
    frame,
    points.map(([sec]) => s(sec)),
    points.map(([, vol]) => vol),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

export type BgmPlan = {
  /** public/music 以下のファイル名 */
  file: string;
  fromSec: number;
  durationSec: number;
  /** fromSec を 0 とした相対秒での音量カーブ */
  volume: [number, number][];
  startFromSec?: number;
};

/**
 * BGM。静かなベッドから劇伴へ受け渡して、後半にかけて音量を上げ続ける。
 * 「テンションが常に上がっていく」のはこのカーブが担当している。
 */
export const Bgm: React.FC<{ plan: BgmPlan[] }> = ({ plan }) => (
  <>
    {plan.map((track) => (
      <Sequence
        key={`${track.file}-${track.fromSec}`}
        from={s(track.fromSec)}
        durationInFrames={s(track.durationSec)}
        name={`bgm:${track.file}`}
        layout="none"
      >
        <Audio
          src={staticFile(`music/${track.file}`)}
          startFrom={s(track.startFromSec ?? 0)}
          volume={curve(track.volume)}
        />
      </Sequence>
    ))}
  </>
);
