import { staticFile, useVideoConfig } from "remotion";

/**
 * 台本: docs/orochi-motivation-video-script.md
 * テロップは白 + 黒背景、強調のみ赤。3色以上使わない。
 */
export const fontFamily = "Noto Sans JP";

/**
 * フォントは public/fonts に置いた Noto Sans JP の可変フォントを直接読む。
 * CDN に依存しないので、オフラインでも同じ絵が出る。
 * FontFace API（@remotion/fonts）ではなく素の @font-face を使っているのは、
 * ヘッドレスでのレンダー中にページが作り直されると FontFace.load() が
 * 返ってこないことがあるため。
 */
export const FONT_FACE_CSS = `
@font-face {
  font-family: '${fontFamily}';
  src: url('${staticFile("fonts/NotoSansJP-VF.woff2")}') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
`;

export const COLOR = {
  bg: "#05060A",
  fg: "#FFFFFF",
  sub: "#8A94A6",
  accent: "#E11D2E",
  line: "#1C212C",
} as const;

export const FPS = 30;

/** 秒 -> フレーム */
export const s = (sec: number) => Math.round(sec * FPS);

/**
 * サイズは 1920x1080 を基準に書く。縦型（1080x1920）でも破綻しないよう
 * 解像度に応じて全体を拡縮する。
 */
export const useScale = () => {
  const { width, height } = useVideoConfig();
  return width >= height ? width / 1920 : width / 1400;
};

/** 縦型かどうか。テロップの折り返し可否を切り替える。 */
export const useIsPortrait = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

export const baseStyle = {
  fontFamily,
  backgroundColor: COLOR.bg,
  color: COLOR.fg,
  WebkitFontSmoothing: "antialiased",
} as const;
