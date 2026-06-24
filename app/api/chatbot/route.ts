import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  type UIMessage,
} from "ai";
import {
  getChatbotOcrResultCount,
  searchChatbotOcrResults,
  type ChatbotOcrSearchResult,
} from "@/app/lib/chatbotOcrKnowledge";
import { getInternalArticlePathForSourceUrl } from "@/app/lib/chatbotInternalArticles";
import {
  chatbotKnowledgeCategories,
  chatbotKnowledgeSources,
  type ChatbotKnowledgeSearchResult,
  searchChatbotKnowledgeSources,
} from "@/app/lib/chatbotKnowledgeSources";

export const maxDuration = 30;

function extractLastUserText(messages: UIMessage[]) {
  return (
    messages
      .at(-1)
      ?.parts.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("") || ""
  );
}

type CombinedKnowledgeResult = {
  kind: "article" | "image-ocr";
  title: string;
  sourceTitle: string;
  url: string;
  score: number;
  excerpts: string[];
  notes?: string[];
};

function fromArticleResult(
  source: ChatbotKnowledgeSearchResult
): CombinedKnowledgeResult {
  return {
    kind: "article",
    title: source.title,
    sourceTitle: source.sourceTitle,
    url: source.url,
    score: source.score,
    excerpts: source.excerpts,
    notes: source.notes,
  };
}

function fromOcrResult(
  source: ChatbotOcrSearchResult
): CombinedKnowledgeResult {
  return {
    kind: "image-ocr",
    title: source.title,
    sourceTitle: source.sourceTitle,
    url: source.url,
    score: source.score,
    excerpts: source.excerpts,
  };
}

function searchCombinedKnowledge(query: string, limit = 5) {
  const articleResults = searchChatbotKnowledgeSources(query, {
    limit: limit * 2,
  }).map(fromArticleResult);
  const ocrResults = searchChatbotOcrResults(query, {
    limit: limit * 3,
  }).map(fromOcrResult);

  const grouped = new Map<string, CombinedKnowledgeResult>();

  for (const result of [...articleResults, ...ocrResults]) {
    const existing = grouped.get(result.url);

    if (!existing) {
      grouped.set(result.url, result);
      continue;
    }

    grouped.set(result.url, {
      ...existing,
      score: Math.max(existing.score, result.score),
      excerpts: [...existing.excerpts, ...result.excerpts]
        .filter(Boolean)
        .filter((excerpt, index, list) => list.indexOf(excerpt) === index)
        .slice(0, 5),
      notes: [...(existing.notes ?? []), ...(result.notes ?? [])]
        .filter(Boolean)
        .filter((note, index, list) => list.indexOf(note) === index),
      kind:
        existing.kind === "image-ocr" || result.kind === "image-ocr"
          ? "image-ocr"
          : "article",
    });
  }

  return [...grouped.values()]
    .sort((a, b) => b.score - a.score || a.sourceTitle.localeCompare(b.sourceTitle))
    .slice(0, limit);
}

function getDisplayUrl(sourceUrl: string) {
  return getInternalArticlePathForSourceUrl(sourceUrl) ?? sourceUrl;
}

function escapeMarkdownLinkText(text: string) {
  return text.replace(/[[\]\\]/g, "\\$&");
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatMarkdownLink(title: string, url: string) {
  return `[${escapeMarkdownLinkText(title)}](${url})`;
}

function getDisplayLink(source: CombinedKnowledgeResult) {
  return formatMarkdownLink(source.sourceTitle, getDisplayUrl(source.url));
}

function buildKnowledgeAnswer(query: string) {
  const results = searchCombinedKnowledge(query, 5);

  if (results.length === 0) {
    return [
      "今のナレッジでは該当しそうな記事を見つけられませんでした。",
      "",
      "登録済みカテゴリ:",
      ...chatbotKnowledgeCategories.map((category) => {
        const count = chatbotKnowledgeSources.filter(
          (source) => source.category === category
        ).length;
        return `- ${category}: ${count}件`;
      }),
      `- OCR画像: ${getChatbotOcrResultCount()}件`,
    ].join("\n");
  }

  const primary = results[0];
  const related = results.slice(1);

  return [
    `あ、それなら「${primary.sourceTitle}」っぽいです。`,
    "",
    `ページ: ${getDisplayLink(primary)}`,
    ...(related.length
      ? [
          "",
          "ほかに近そうな候補:",
          ...related.map(
            (source) => `- ${getDisplayLink(source)}`
          ),
        ]
      : []),
  ].join("\n");
}

function buildChatContext(results: CombinedKnowledgeResult[]) {
  return results
    .slice(0, 3)
    .map((source, index) => {
      const excerpts = source.excerpts
        .filter(Boolean)
        .slice(0, 4)
        .map((excerpt) => `  - ${excerpt}`)
        .join("\n");

      return [
        `候補${index + 1}`,
        `タイトル: ${source.sourceTitle}`,
        `URL: ${getDisplayUrl(source.url)}`,
        excerpts ? `抜粋:\n${excerpts}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function appendVerifiedSourceLinks(
  text: string,
  results: CombinedKnowledgeResult[]
) {
  const sources = results.slice(0, 3).map((source) => ({
    title: source.sourceTitle,
    url: getDisplayUrl(source.url),
  }));
  const normalizedText = sources.reduce((current, source) => {
    const leaf = source.url.split("/").filter(Boolean).at(-1);
    if (!leaf) return current;

    return current.replace(
      new RegExp(`(^|[\\s(])/${escapeRegExp(leaf)}\\b`, "g"),
      `$1${source.url}`
    );
  }, text);

  const linkedText = sources.reduce((current, source) => {
    const urlPattern = new RegExp(`(?<!\\]\\()${escapeRegExp(source.url)}`, "g");
    return current.replace(
      urlPattern,
      formatMarkdownLink(source.title, source.url)
    );
  }, normalizedText);

  const sourceLines = sources
    .filter((source) => !linkedText.includes(`](${source.url})`))
    .map((source) => `- ${formatMarkdownLink(source.title, source.url)}`);

  if (sourceLines.length === 0) return linkedText;

  return [`${linkedText.trim()}`, "", "参照ページ:", ...sourceLines].join("\n");
}

function createTextResponse(messages: UIMessage[], text: string) {
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: ({ writer }) => {
      const id = "knowledge-text";
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
  const lastText = extractLastUserText(messages);
  const results = searchCombinedKnowledge(lastText, 5);

  if (results.length === 0 || process.env.CHATBOT_LIVE_OPENAI === "false") {
    return createTextResponse(messages, buildKnowledgeAnswer(lastText));
  }

  if (!process.env.OPENAI_API_KEY) {
    return createTextResponse(
      messages,
      `${buildKnowledgeAnswer(lastText)}\n\n補足: OPENAI_API_KEY が未設定のため、ローカル検索結果を返しています。`
    );
  }

  try {
    const context = buildChatContext(results);
    const recentMessages = messages.slice(-6);
    const result = await generateText({
      model: openai(process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini"),
      system: [
        "あなたはLevelaの社内向けチャットボットです。返答は自然な日本語で、社内メンバーが次に見るべきページをすぐ分かるように案内してください。",
        "下の検索候補だけを根拠に回答してください。候補にない内容は推測で補わないでください。",
        "必ず候補にあるURLをそのまま含めてください。内部記事URLがある場合はNotion URLではなく内部記事URLを優先してください。ローカル画像パス、画像番号、OCRという言葉、署名付き画像URLは出さないでください。",
        "ログインID、パスワード、APIキー、カード番号、口座番号などの機密情報は出さないでください。",
        "回答は短めにしてください。目安は2〜5文。必要なら候補URLを2〜3件まで並べてください。",
        "毎回同じ枕詞にしないでください。ユーザーの聞き方に合わせて自然に返してください。",
        "",
        "検索候補:",
        context,
      ].join("\n"),
      messages: await convertToModelMessages(recentMessages),
      providerOptions: {
        openai: {
          store: false,
        },
      },
    });

    return createTextResponse(messages, appendVerifiedSourceLinks(result.text, results));
  } catch (error) {
    return createTextResponse(
      messages,
      `${buildKnowledgeAnswer(lastText)}\n\n補足: ${
        error instanceof Error ? error.message : "OpenAI API 実行に失敗しました。"
      }`
    );
  }
}
