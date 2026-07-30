// Normalises the raw phone clip into something the Remotion compositor can
// decode quickly and reliably: baked-in rotation, 8-bit SDR, H.264.
//
// The original iPhone capture is 1920x1080 Dolby Vision HEVC 10-bit with a -90°
// display matrix. Decoding that at render concurrency crashes the compositor,
// so we transcode once up front.
//
//   node scripts/prepare-source.mjs [input] [output]
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const input = process.argv[2] ?? path.join(root, "public/media/source.mov");
const output = process.argv[3] ?? path.join(root, "public/media/source-h264.mp4");

if (!existsSync(input)) {
  console.error(
    `Missing input clip: ${input}\n` +
      "Drop the original capture there (or pass a path) and re-run.",
  );
  process.exit(1);
}

const args = [
  "remotion", "ffmpeg", "-hide_banner", "-y",
  "-i", input,
  "-map", "0:v:0", "-map", "0:a:0",
  // ffmpeg auto-applies the display matrix, so this lands as 1080x1920 portrait.
  "-vf", "scale=1080:1920:flags=lanczos,format=yuv420p",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-c:a", "aac", "-b:a", "192k",
  output,
];

const result = spawnSync("npx", args, { stdio: "inherit", cwd: root });
process.exit(result.status ?? 1);
