import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setCrf(18);
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");

// Sandboxed/CI machines that cannot download Remotion's bundled Chrome can point
// at an existing Chromium instead, e.g.
// REMOTION_BROWSER=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run render
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
