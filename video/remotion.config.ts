import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(22);
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
Config.setDelayRenderTimeoutInMilliseconds(180000);
