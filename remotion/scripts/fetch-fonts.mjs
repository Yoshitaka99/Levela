// Builds the telop font asset: downloads only the Google Fonts woff2 subset
// chunks that actually contain the glyphs the compositions use, and writes them
// into `src/generated/telop-font.json` as base64.
//
// They are inlined rather than served from `public/` on purpose — fetching font
// files from Remotion's static server inside a background render tab can stall,
// which times out the delayRender() that holds the render for the fonts.
//
// Run once (needs network): `npm run fonts`
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_FILE = path.join(
  import.meta.dirname,
  "..",
  "src",
  "generated",
  "telop-font.json",
);

const FAMILIES = [
  { css: "Noto+Sans+JP:wght@900", family: "Noto Sans JP", weight: "900" },
];

// Every character the compositions can render. Keep in sync with the telop copy.
const GLYPHS = [
  "勝ちに行くキモチ！",
  "気合い本気全力魂",
  "、。・…！？",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789 !?.,-'\"",
].join("");

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Parses `unicode-range: U+30, U+31-33` into a list of [start, end] pairs. */
const parseRanges = (raw) =>
  raw.split(",").map((part) => {
    const [start, end] = part.trim().replace(/^U\+/i, "").split("-");
    return [parseInt(start, 16), parseInt(end ?? start, 16)];
  });

const main = async () => {
  const codepoints = [...new Set([...GLYPHS].map((c) => c.codePointAt(0)))];
  const subsets = [];

  for (const { css, family, weight } of FAMILIES) {
    const res = await fetch(
      `https://fonts.googleapis.com/css2?family=${css}&display=block`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) throw new Error(`${res.status} fetching the CSS for ${family}`);
    const sheet = await res.text();

    for (const block of sheet.split("@font-face").slice(1)) {
      const url = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
      const rangeRaw = block.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
      if (!url || !rangeRaw) continue;

      const ranges = parseRanges(rangeRaw);
      const covered = codepoints.filter((cp) =>
        ranges.some(([from, to]) => cp >= from && cp <= to),
      );
      if (covered.length === 0) continue;

      const font = await fetch(url, { headers: { "User-Agent": UA } });
      if (!font.ok) throw new Error(`${font.status} fetching ${url}`);
      const bytes = Buffer.from(await font.arrayBuffer());

      subsets.push({
        family,
        weight,
        unicodeRange: rangeRaw,
        base64: bytes.toString("base64"),
      });
      console.log(
        `${family}: subset #${subsets.length} (${covered.length} glyphs, ${Math.round(
          bytes.length / 1024,
        )}KB)`,
      );
    }

    if (subsets.length === 0) throw new Error(`No subset matched for ${family}`);
  }

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(subsets)}\n`);
  console.log(`Wrote ${subsets.length} subsets to src/generated/telop-font.json`);
};

await main();
