import { renderLifePlanRiskMapPng, type LifePlanRiskMapForm } from "@/app/lib/life-plan/renderRiskMap";
import OpenAI from "openai";
import type { ImageGenerateParamsNonStreaming } from "openai/resources/images";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PROMPT_LENGTH = 32000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function imageModel() {
  return process.env.OPENAI_LIFE_PLAN_IMAGE_MODEL
    || process.env.OPENAI_IMAGE_MODEL
    || "gpt-image-2";
}

function imageSize(model: string) {
  if (model.startsWith("gpt-image-2")) {
    return "1536x864";
  }

  return "1536x1024";
}

function imageQuality() {
  const configured = process.env.OPENAI_LIFE_PLAN_IMAGE_QUALITY;

  if (configured === "low" || configured === "medium" || configured === "high") {
    return configured;
  }

  return "high";
}

function clientIp(request: NextRequest) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "anonymous";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = rateBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    const minutes = Math.max(1, Math.ceil((current.resetAt - now) / 60000));
    return `画像生成の回数が一時的に上限に達しました。約${minutes}分後にもう一度試してください。`;
  }

  current.count += 1;
  return null;
}

function friendlyOpenAiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("billing hard limit") || lower.includes("quota")) {
    return "OpenAI APIの課金上限に達しています。OpenAI Platform側で上限を解除すると、この画面から画像生成できます。";
  }

  if (lower.includes("incorrect api key") || lower.includes("invalid api key") || lower.includes("401")) {
    return "OpenAI APIキーが無効です。.env.localまたは公開環境のOPENAI_API_KEYを確認してください。";
  }

  if (lower.includes("content policy") || lower.includes("safety")) {
    return "安全フィルターにより生成できませんでした。入力内容やプロンプトを少し柔らかくして再生成してください。";
  }

  return "画像生成に失敗しました。少し時間を置いてもう一度試してください。";
}

function buildIdealProductionPrompt(sourcePrompt: string) {
  return [
    "Create one polished 16:9 horizontal infographic image for a Japanese life-planning consultation.",
    "Main concept: Lifestyle Vision Map.",
    "Goal: Create an aspirational Japanese life-planning infographic that helps the client feel hope, clarity, and a desire to take action.",
    "Visual mood: premium, calm, optimistic, elegant, emotionally warm, consultant-grade.",
    "Color direction: warm white, soft rose, muted emerald, deep charcoal, gentle gold accents.",
    "",
    "Quality requirements:",
    "- Make it look like a finished premium consulting slide, not a rough AI poster.",
    "- Use a clean editorial layout with strong hierarchy, generous margins, and balanced whitespace.",
    "- Use realistic flat illustration or semi-flat editorial illustration, not photorealistic people.",
    "- Use clear cards, vision blocks, and short numeric callout areas.",
    "- Avoid clutter, tiny text, fake logos, watermarks, distorted UI, screenshots, or random symbols.",
    "- Keep Japanese text minimal and large. Use short labels only, because readability matters.",
    "- Use no more than 6 short Japanese text labels in the image.",
    "- Do not draw paragraphs of small Japanese text. Prefer visual structure over text density.",
    "",
    "Suggested Japanese labels:",
    "理想の暮らし / 家族時間 / 発信テーマ / 強み / 未来設計 / 今から整える",
    "",
    "Use the client details below as source material. Do not copy the entire text into the image.",
    "",
    "SOURCE MATERIAL:",
    sourcePrompt.slice(0, 14000),
  ].join("\n");
}

export async function POST(request: NextRequest) {
  let payload: { prompt?: unknown; kind?: unknown; form?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const kind = payload.kind === "ideal" ? "ideal" : "crisis";
  const form = typeof payload.form === "object" && payload.form !== null
    ? payload.form as LifePlanRiskMapForm
    : null;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt is too long. Keep it under ${MAX_PROMPT_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const rateLimitError = checkRateLimit(clientIp(request));

  if (rateLimitError) {
    return NextResponse.json({ error: rateLimitError }, { status: 429 });
  }

  if (kind === "crisis" && form) {
    const png = await renderLifePlanRiskMapPng(form);

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${png.toString("base64")}`,
      kind,
      model: "local-risk-map-renderer",
      size: "1800x970",
      quality: "print",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEYが未設定です。.env.localまたは公開環境の環境変数に設定してください。",
      },
      { status: 503 },
    );
  }

  const model = imageModel();

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const generationParams: ImageGenerateParamsNonStreaming = {
      model,
      prompt: buildIdealProductionPrompt(prompt),
      n: 1,
      size: imageSize(model),
      quality: imageQuality(),
      output_format: "png",
      user: `life-plan-risk-map:${clientIp(request)}`,
    };

    const response = await client.images.generate(generationParams);
    const b64 = response.data?.[0]?.b64_json;

    if (!b64) {
      return NextResponse.json(
        { error: "Image generation completed, but no image data was returned." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${b64}`,
      kind,
      model,
      size: imageSize(model),
      quality: imageQuality(),
    });
  } catch (error) {
    console.error("Life plan image generation failed", error);
    return NextResponse.json(
      { error: friendlyOpenAiError(error) },
      { status: 500 },
    );
  }
}
