import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import OpenAI from "openai";
import sharp from "sharp";
import { publicBaseUrl } from "./env";
import type { AutomationImage } from "./types";

const PUBLIC_OUTPUT_DIR = path.join(process.cwd(), "public", "generated", "automation");

export type RankingImageMember = {
  name: string;
  points: number;
  rank?: number;
};

export type RankingImageOptions = {
  id: string;
  phase: number;
  day: number;
  gitDaysLeft: number;
  total: RankingImageMember[];
  daily: RankingImageMember[];
};

export async function renderAutomationImage(id: string, summary: string) {
  const outputDir = process.env.VERCEL
    ? path.join(os.tmpdir(), "levela-automation")
    : PUBLIC_OUTPUT_DIR;
  await fs.mkdir(outputDir, { recursive: true });

  if (process.env.OPENAI_API_KEY && process.env.OPENAI_IMAGE_MODEL) {
    const aiImage = await tryRenderOpenAiImage(id, summary, outputDir);
    if (aiImage) {
      return aiImage;
    }
  }

  const filePath = path.join(outputDir, `${id}.png`);
  const png = await sharp(Buffer.from(makeSummarySvg(summary))).png().toBuffer();
  await fs.writeFile(filePath, png);
  return {
    imagePath: filePath,
    imageUrl: process.env.VERCEL ? "" : `${publicBaseUrl()}/generated/automation/${id}.png`,
    imageDataUrl: `data:image/png;base64,${png.toString("base64")}`,
    usedAiImage: false,
  };
}

export async function renderAiDrillRankingImages(options: RankingImageOptions) {
  const outputDir = process.env.VERCEL
    ? path.join(os.tmpdir(), "levela-automation")
    : PUBLIC_OUTPUT_DIR;
  await fs.mkdir(outputDir, { recursive: true });

  const total = await writeRankingImage({
    id: options.id,
    outputDir,
    label: "総合ポイントランキング",
    fileName: "ai-drill-total-ranking.png",
    svg: makeRankingSvg({
      variant: "total",
      phase: options.phase,
      day: options.day,
      title: "総合ポイントランキング",
      subtitle: "みんなの努力が、この結果に繋がった！本当にお疲れ様でした！！",
      topMessage: "行ける行ける 絶対いける",
      sideMessage: "積み上げた日々が\n未来の自分を\n圧倒的に変える！",
      bottomMessage: `今日の積み上げは、必ずアポの成果につながる！ みんなの行動力がチームを最強にする！`,
      footerBadge: `Git編終了まで あと${options.gitDaysLeft}日！！！！`,
      members: options.total,
    }),
  });

  const daily = await writeRankingImage({
    id: options.id,
    outputDir,
    label: "デイリーランキング",
    fileName: "ai-drill-daily-ranking.png",
    svg: makeRankingSvg({
      variant: "daily",
      phase: options.phase,
      day: options.day,
      title: "デイリーランキング",
      subtitle: "昨日からの積み上げが未来を変える！この一歩が、圧倒的な差になる！",
      topMessage: "PHASE2はまだ始まったばかり！",
      sideMessage: "昨日の自分を超えろ！\nその積み上げが\n最強の武器になる！",
      bottomMessage: "今日の積み上げは、必ずアポの成果につながる！ みんなの行動力がチームを最強にする！",
      footerBadge: "PHASE2はまだ始まったばかり！",
      members: options.daily,
    }),
  });

  return { primary: total, extraImages: [daily] };
}

async function writeRankingImage({
  id,
  outputDir,
  label,
  fileName,
  svg,
}: {
  id: string;
  outputDir: string;
  label: string;
  fileName: string;
  svg: string;
}): Promise<AutomationImage> {
  const scopedFileName = `${id}-${fileName}`;
  const filePath = path.join(outputDir, scopedFileName);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await fs.writeFile(filePath, png);
  return {
    label,
    fileName,
    imagePath: filePath,
    imageUrl: process.env.VERCEL ? "" : `${publicBaseUrl()}/generated/automation/${scopedFileName}`,
    imageDataUrl: `data:image/png;base64,${png.toString("base64")}`,
    usedAiImage: false,
  };
}

async function tryRenderOpenAiImage(id: string, summary: string, outputDir: string) {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL,
      prompt: [
        "Create a polished Japanese social media briefing image.",
        "Use clean editorial layout, readable Japanese text zones, and a professional modern style.",
        "Do not include fake logos or screenshots.",
        `Brief:\n${summary}`,
      ].join("\n"),
      size: "1024x1024",
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) return null;

    const imageBuffer = Buffer.from(b64, "base64");
    const filePath = path.join(outputDir, `${id}.png`);
    await fs.writeFile(filePath, imageBuffer);
    return {
      imagePath: filePath,
      imageUrl: process.env.VERCEL ? "" : `${publicBaseUrl()}/generated/automation/${id}.png`,
      imageDataUrl: `data:image/png;base64,${imageBuffer.toString("base64")}`,
      usedAiImage: true,
    };
  } catch (error) {
    console.warn(
      "OpenAI image generation failed. Falling back to local renderer.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return null;
  }
}

function makeSummarySvg(summary: string) {
  const lines = wrapText(summary, 34).slice(0, 20);
  const escapedLines = lines.map(escapeXml);
  const tspans = escapedLines.map((line, index) => (
    `<tspan x="86" dy="${index === 0 ? 0 : 38}">${line}</tspan>`
  )).join("");

  return `
<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1200" fill="#101418"/>
  <rect x="52" y="52" width="1096" height="1096" rx="28" fill="#f6f1e7"/>
  <rect x="86" y="86" width="1028" height="10" fill="#1f7a6d"/>
  <text x="86" y="164" font-family="Arial, 'Noto Sans JP', sans-serif" font-size="42" font-weight="700" fill="#17201f">Levela Trigger Brief</text>
  <text x="86" y="234" font-family="Arial, 'Noto Sans JP', sans-serif" font-size="30" font-weight="500" fill="#263331">${tspans}</text>
  <text x="86" y="1092" font-family="Arial, sans-serif" font-size="24" fill="#65706c">Generated by Levela automation</text>
</svg>`;
}

function wrapText(text: string, lineLength: number) {
  const normalized = text.replace(/\r/g, "").split("\n").flatMap((line) => {
    const chunks: string[] = [];
    let current = "";
    for (const char of line.trim()) {
      current += char;
      if (current.length >= lineLength) {
        chunks.push(current);
        current = "";
      }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : [""];
  });
  return normalized;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeRankingSvg({
  variant,
  phase,
  day,
  title,
  subtitle,
  topMessage,
  sideMessage,
  bottomMessage,
  footerBadge,
  members,
}: {
  variant: "total" | "daily";
  phase: number;
  day: number;
  title: string;
  subtitle: string;
  topMessage: string;
  sideMessage: string;
  bottomMessage: string;
  footerBadge: string;
  members: RankingImageMember[];
}) {
  const palette = variant === "total"
    ? {
        main: "#ffd21f",
        main2: "#ff3b16",
        accent: "#fff3a0",
        dark: "#080101",
        line: "#ff2b19",
        shadow: "#3b0300",
      }
    : {
        main: "#38bdf8",
        main2: "#0ea5e9",
        accent: "#ffe033",
        dark: "#020617",
        line: "#0284c7",
        shadow: "#001a55",
      };

  const top = members.slice(0, 3);
  const rest = members.slice(3, 9);
  const topPanels = top.map((member, index) => {
    const y = 250 + index * 160;
    const medal = ["#ffd700", "#dbeafe", "#f59e0b"][index] || palette.main;
    return `
      <g filter="url(#softGlow)">
        <rect x="34" y="${y}" width="580" height="136" fill="rgba(0,0,0,.74)" stroke="${index === 0 ? palette.main : palette.line}" stroke-width="4"/>
        <text x="78" y="${y + 88}" font-size="94" font-weight="900" fill="${medal}" stroke="#111" stroke-width="2">${index + 1}位</text>
        <text x="300" y="${y + 58}" font-size="48" font-weight="900" fill="#fff">${escapeXml(member.name)}</text>
        <text x="300" y="${y + 116}" font-size="58" font-weight="900" fill="${index === 1 ? "#f8fafc" : palette.main}">${formatRankingPoints(member.points, variant)}</text>
      </g>`;
  }).join("");

  const rows = rest.map((member, index) => {
    const y = 262 + index * 82;
    return `
      <g>
        <rect x="650" y="${y - 48}" width="690" height="74" fill="rgba(0,0,0,.66)" stroke="${palette.line}" stroke-width="2"/>
        <text x="684" y="${y + 4}" font-size="42" font-weight="900" fill="#dbeafe">${member.rank ?? index + 4}位</text>
        <text x="812" y="${y + 4}" font-size="42" font-weight="900" fill="#fff">${escapeXml(member.name)}</text>
        <text x="1130" y="${y + 4}" font-size="42" font-weight="900" fill="${palette.main}" text-anchor="end">${formatRankingPoints(member.points, variant)}</text>
      </g>`;
  }).join("");

  const sideTspans = sideMessage.split("\n").map((line, index) => (
    `<tspan x="1390" dy="${index === 0 ? 0 : 62}">${escapeXml(line)}</tspan>`
  )).join("");

  return `
<svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="75%">
      <stop offset="0" stop-color="${palette.shadow}"/>
      <stop offset="0.45" stop-color="${palette.dark}"/>
      <stop offset="1" stop-color="#000"/>
    </radialGradient>
    <filter id="softGlow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="textGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="titleGrad" x1="0" x2="1">
      <stop offset="0" stop-color="#fff"/>
      <stop offset=".45" stop-color="${palette.main}"/>
      <stop offset="1" stop-color="${palette.main2}"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  ${makeLightning(palette.line, palette.main)}
  <text x="145" y="152" font-size="132" font-weight="900" fill="${palette.main}" opacity=".22" filter="url(#textGlow)">龍</text>
  <text x="800" y="64" text-anchor="middle" font-size="50" font-weight="900" fill="#fff" stroke="#111" stroke-width="3">PHASE${phase}　<tspan fill="${palette.main}">${day}日目</tspan> 結果発表！</text>
  <text x="800" y="168" text-anchor="middle" font-size="104" font-weight="900" fill="url(#titleGrad)" stroke="#050505" stroke-width="6" filter="url(#textGlow)">${title}</text>
  <text x="800" y="218" text-anchor="middle" font-size="33" font-weight="900" fill="#fff">${escapeXml(subtitle)}</text>
  <g transform="rotate(-8 1400 170)">
    <rect x="1330" y="86" width="252" height="142" fill="#050505" opacity=".9"/>
    <text x="1456" y="138" text-anchor="middle" font-size="36" font-weight="900" fill="${palette.main}">${escapeXml(topMessage)}</text>
    <text x="1456" y="190" text-anchor="middle" font-size="28" font-weight="900" fill="#fff">積み上げた今日が</text>
    <text x="1456" y="226" text-anchor="middle" font-size="28" font-weight="900" fill="${palette.main}">明日の自分を作る！</text>
  </g>
  ${topPanels}
  <rect x="640" y="250" width="714" height="510" fill="rgba(2,6,23,.54)" stroke="${palette.line}" stroke-width="3"/>
  ${rows}
  <g transform="rotate(-10 1410 620)">
    <rect x="1314" y="560" width="284" height="204" fill="#050505" opacity=".92"/>
    <text y="620" text-anchor="middle" font-size="38" font-weight="900" fill="#fff">${sideTspans}</text>
  </g>
  <text x="800" y="842" text-anchor="middle" font-size="46" font-weight="900" fill="#fff" stroke="#111" stroke-width="3">${highlightBottom(bottomMessage, palette.main)}</text>
  <rect x="1190" y="786" width="374" height="82" fill="#080808" stroke="${palette.main}" stroke-width="3"/>
  <text x="1377" y="840" text-anchor="middle" font-size="36" font-weight="900" fill="#fff">${escapeXml(footerBadge)}</text>
</svg>`;
}

function makeLightning(line: string, main: string) {
  const bolts = [
    "M20 120 L260 30 L196 190 L420 80 L326 300 L610 70",
    "M1080 30 L980 210 L1160 150 L1030 390 L1320 98",
    "M120 790 L310 640 L280 780 L500 610",
    "M1390 260 L1284 440 L1500 380 L1370 690",
  ];
  return bolts.map((d) => `<path d="${d}" fill="none" stroke="${line}" stroke-width="9" opacity=".9" filter="url(#softGlow)"/><path d="${d}" fill="none" stroke="${main}" stroke-width="3" opacity=".95"/>`).join("");
}

function formatRankingPoints(points: number, variant: "total" | "daily") {
  if (variant === "daily") {
    return `${points > 0 ? "+" : points === 0 ? "±" : ""}${points.toLocaleString()}XP`;
  }
  return `${points.toLocaleString()}XP`;
}

function highlightBottom(message: string, highlight: string) {
  return escapeXml(message).replace(/アポの成果|最強/g, (value) => `<tspan fill="${highlight}">${value}</tspan>`);
}
