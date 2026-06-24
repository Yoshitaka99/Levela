import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

export const maxDuration = 30;

const programNotes = {
  ai_drill: {
    label: "AIドリル",
    summary:
      "学習進捗、ランキング、教材化の相談を受ける想定です。現段階では固定データで返し、後でLevela側のAPIやスプレッドシートに差し替えます。",
    nextActions: ["進捗確認", "弱点整理", "次回課題の提案"],
  },
  sales: {
    label: "営業支援",
    summary:
      "商談メモ、追客文面、次アクション整理を扱う想定です。後で顧客シート、Oro運用、Discord通知に接続できます。",
    nextActions: ["状況ヒアリング", "追客文面作成", "対応優先度の整理"],
  },
  operations: {
    label: "運用サポート",
    summary:
      "予約、日程、社内連絡、定例作業の下書きを扱う想定です。後でGoogle CalendarやSheets APIに接続できます。",
    nextActions: ["タスク分解", "担当者確認", "通知文面作成"],
  },
};

function extractLastUserText(messages: UIMessage[]) {
  return (
    messages
      .at(-1)
      ?.parts.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("") || ""
  );
}

function guessApiHint(text: string) {
  if (text.includes("予定") || text.includes("予約") || text.includes("日程")) {
    return "Google Calendar API";
  }
  if (
    text.includes("シート") ||
    text.includes("顧客") ||
    text.includes("売上") ||
    text.includes("ランキング")
  ) {
    return "Google Sheets API";
  }
  if (text.toLowerCase().includes("discord") || text.includes("通知")) {
    return "Discord Webhook";
  }
  return "OpenAI API + 業務APIツール";
}

function mockChatResponse(messages: UIMessage[], reason?: string) {
  const lastText = extractLastUserText(messages);
  const apiHint = guessApiHint(lastText);
  const text = [
    "ローカル用の雛形として応答しています。",
    "",
    `- 会話エンジン: OpenAI API`,
    `- 次に接続する候補: ${apiHint}`,
    "- 現在の業務API部分: モックツール",
    "",
    "実データの接続先が決まれば、このUIのまま Sheets、Calendar、Discord などに差し替えできます。",
    reason ? `\n補足: ${reason}` : "",
  ].join("\n");

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: ({ writer }) => {
      const id = "mock-text";
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  if (process.env.CHATBOT_LIVE_OPENAI !== "true") {
    return mockChatResponse(
      messages,
      "実APIを使う場合は .env.local に CHATBOT_LIVE_OPENAI=true を追加してください。"
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return mockChatResponse(
      messages,
      "OPENAI_API_KEY が未設定のため、モック応答に切り替えています。"
    );
  }

  try {
    const result = streamText({
      model: openai(process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini"),
      system: [
        "あなたはLevelaのチャットボットです。",
        "一般ユーザーには自然で短い会話として返し、管理者向けの内部事情は出しすぎないでください。",
        "必要に応じて利用できる業務APIツールを使って回答します。",
        "未接続の外部APIについては、実行済みのように装わず、現在は雛形または固定データであることを明確にします。",
        "回答は日本語で、結論から簡潔に返してください。",
      ].join("\n"),
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(4),
      providerOptions: {
        openai: {
          store: false,
        },
      },
      tools: {
        getLevelaProgramInfo: tool({
          description:
            "Levela内の想定業務領域について、接続予定APIと次アクション候補を返す。",
          inputSchema: z.object({
            area: z
              .enum(["ai_drill", "sales", "operations"])
              .describe("相談カテゴリ"),
          }),
          execute: async ({ area }) => programNotes[area],
        }),
        makeFollowUpDraft: tool({
          description:
            "顧客やメンバーへの短い追客・確認メッセージ案を作る。外部送信はしない。",
          inputSchema: z.object({
            recipient: z.string().describe("送る相手の名前や属性"),
            purpose: z.string().describe("連絡目的"),
            tone: z
              .enum(["casual", "polite", "firm"])
              .default("polite")
              .describe("文面のトーン"),
          }),
          execute: async ({ recipient, purpose, tone }) => {
            const opening =
              tone === "casual"
                ? `${recipient}さん、お疲れさまです。`
                : `${recipient}さん\nお世話になっております。`;
            const close =
              tone === "firm"
                ? "本日中にご確認をお願いいたします。"
                : "ご確認いただけますと幸いです。";

            return {
              draft: `${opening}\n${purpose}について確認したくご連絡しました。\n可能な範囲で現在の状況を教えてください。\n${close}`,
              sent: false,
            };
          },
        }),
        classifyNextApi: tool({
          description:
            "ユーザーの要望に対して次に接続すべきAPI候補を分類する。",
          inputSchema: z.object({
            request: z.string().describe("ユーザーの要望"),
          }),
          execute: async ({ request }) => ({
            api: guessApiHint(request),
            reason: "会話内容から接続候補を推定しました。",
          }),
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) =>
        error instanceof Error ? error.message : "AI response failed.",
    });
  } catch (error) {
    return mockChatResponse(
      messages,
      error instanceof Error ? error.message : "OpenAI API 実行に失敗しました。"
    );
  }
}
