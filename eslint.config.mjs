import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "tmp_*/**",
    "generated_*/**",
    "outputs/**",
    "public/sw.js",
    // Remotion video project has its own eslint config (video/eslint.config.mjs).
    "video/**",
    // Agent skills bundled from remotion-dev/skills (reference code, not app code).
    ".agents/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
