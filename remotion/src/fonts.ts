import subsets from "./generated/telop-font.json";

export const TELOP_FONT = "'Noto Sans JP', 'IPAGothic', sans-serif";

const STYLE_ID = "telop-font-faces";

/**
 * Declares the Noto Sans JP Black subsets that `npm run fonts` inlined into
 * `generated/telop-font.json`.
 *
 * Two deliberate choices here:
 * - The bytes are base64 data URLs instead of files under `public/`, so no font
 *   request ever has to reach Remotion's static server.
 * - A plain `<style>` tag, not the FontFace API plus delayRender(). Remotion
 *   already awaits `document.fonts.ready` before capturing each frame, and
 *   `FontFace.load()` can sit unresolved in a backgrounded render tab, which
 *   blows the delayRender() timeout and kills the render.
 */
export const loadTelopFonts = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = subsets
    .map((subset) =>
      [
        "@font-face {",
        `  font-family: '${subset.family}';`,
        "  font-style: normal;",
        `  font-weight: ${subset.weight};`,
        "  font-display: block;",
        `  src: url(data:font/woff2;base64,${subset.base64}) format('woff2');`,
        `  unicode-range: ${subset.unicodeRange};`,
        "}",
      ].join("\n"),
    )
    .join("\n");

  document.head.appendChild(style);
};
