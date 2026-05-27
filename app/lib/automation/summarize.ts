import OpenAI from "openai";
import type { AutomationSource } from "./types";

export async function summarizeForImage(
  sources: AutomationSource[],
  discordText = "",
  instruction = "",
) {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await summarizeWithOpenAI(sources, discordText, instruction);
    } catch (error) {
      console.warn(
        "OpenAI text summarization failed. Falling back to local summary.",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  return summarizeLocally(sources, discordText, instruction);
}

function summarizeLocally(
  sources: AutomationSource[],
  discordText = "",
  instruction = "",
) {
  const sourceLines = sources.map((source, index) => {
    const text = source.text || "本文を抽出できませんでした。";
    return `${index + 1}. ${source.title}: ${text.slice(0, 220)}`;
  });

  return [
    instruction || "指定情報を処理して、次のアクションに使える画像用メモに整理しました。",
    discordText ? `Discord: ${discordText}` : "",
    ...sourceLines,
  ].filter(Boolean).join("\n");
}

async function summarizeWithOpenAI(
  sources: AutomationSource[],
  discordText: string,
  instruction: string,
) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const input = [
    "URL本文とDiscord文脈を処理し、1枚画像に載せる短い日本語ブリーフを作ってください。",
    "出力はタイトル1行、要点3-5個、次の一手1個。煽りすぎず、具体的に。",
    instruction ? `追加指示: ${instruction}` : "",
    discordText ? `Discord情報: ${discordText}` : "",
    ...sources.map((source, index) => (
      `Source ${index + 1}: ${source.title}\nURL: ${source.url}\n${source.text}`
    )),
  ].filter(Boolean).join("\n\n");

  const response = await client.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
    input,
  });

  return response.output_text.trim();
}
