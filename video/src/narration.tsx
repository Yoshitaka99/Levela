import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import narration from "./narration.json";
import { COLOR, s } from "./theme";
import { Narration } from "./components/Telop";

export type NarrationLine = {
  id: string;
  text: string;
  fromSec: number;
  durSec: number;
  /** false のときは画面下の字幕を出さない（大きいテロップとして既に出ている行） */
  subtitle: boolean;
};

export type SceneId = keyof typeof narration.scenes;

export const linesOf = (scene: SceneId): NarrationLine[] =>
  narration.scenes[scene] as NarrationLine[];

/** シーンの最後のセリフが終わる時刻（秒）。尺を決めるときの目安に使う。 */
export const narrationEndSec = (scene: SceneId): number =>
  Math.max(...linesOf(scene).map((l) => l.fromSec + l.durSec));

/**
 * ナレーション音声。1行 = 1ファイル。
 * scripts/build_narration.py が public/narration/<scene>/<id>.mp3 を作る。
 */
export const NarrationAudio: React.FC<{ scene: SceneId; volume?: number }> = ({
  scene,
  volume = 1,
}) => (
  <>
    {linesOf(scene).map((line) => (
      <Sequence
        key={line.id}
        from={s(line.fromSec)}
        durationInFrames={s(line.durSec) + 6}
        name={`vo:${line.id}`}
        layout="none"
      >
        <Audio src={staticFile(`narration/${scene}/${line.id}.mp3`)} volume={volume} />
      </Sequence>
    ))}
  </>
);

/** ナレーションの字幕。音声と同じデータから出しているので必ず尺が合う。 */
export const NarrationSubtitles: React.FC<{ scene: SceneId; highlight?: string[] }> = ({
  scene,
  highlight = [],
}) => (
  <>
    {linesOf(scene)
      .filter((line) => line.subtitle)
      .map((line) => (
        <Narration
          key={line.id}
          text={line.text}
          from={s(line.fromSec)}
          duration={s(line.durSec)}
          color={highlight.includes(line.id) ? COLOR.fg : COLOR.sub}
        />
      ))}
  </>
);

/** 音声と字幕をまとめて置く。シーン側はこれ1行でよい。 */
export const NarrationTrackFor: React.FC<{ scene: SceneId; highlight?: string[] }> = ({
  scene,
  highlight,
}) => (
  <>
    <NarrationAudio scene={scene} />
    <NarrationSubtitles scene={scene} highlight={highlight} />
  </>
);
