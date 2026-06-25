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
import { appendChatbotQuestionLog } from "@/app/lib/chatbotQuestionLog";
import {
  classifyChatbotQuestion,
  determineChatbotAnswerStatus,
  determineChatbotAnswerStatusFromAnswer,
} from "@/app/lib/chatbotQuestionTaxonomy";
import {
  isChatbotRagReady,
  searchChatbotRag,
  type ChatbotRagSearchResult,
} from "@/app/lib/chatbotRag";

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
  kind: "article" | "image-ocr" | "rag";
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

function fromRagResult(source: ChatbotRagSearchResult): CombinedKnowledgeResult {
  return {
    kind: "rag",
    title: source.title,
    sourceTitle: source.sourceTitle,
    url: source.url,
    score: source.score,
    excerpts: source.excerpts,
    notes: source.notes,
  };
}

async function searchCombinedKnowledge(query: string, limit = 5) {
  const ragResults =
    process.env.OPENAI_API_KEY && isChatbotRagReady()
      ? await searchChatbotRag(query, { limit: limit * 2 }).catch(() => [])
      : [];
  const articleResults = searchChatbotKnowledgeSources(query, {
    limit: limit * 2,
  }).map(fromArticleResult);
  const ocrResults = searchChatbotOcrResults(query, {
    limit: limit * 3,
  }).map(fromOcrResult);

  const grouped = new Map<string, CombinedKnowledgeResult>();

  for (const result of [...ragResults.map(fromRagResult), ...articleResults, ...ocrResults]) {
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
        existing.kind === "rag" || result.kind === "rag"
          ? "rag"
          : existing.kind === "image-ocr" || result.kind === "image-ocr"
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

function cleanExcerpt(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\{color="[^"]+"\}/g, "")
    .replace(/^#{1,6}\s*/g, "")
    .replace(/^\s*[-*]\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function createEvidenceTerms(query: string) {
  const normalizedQuery = query
    .replace(/[！？?!。、,，.．「」『』（）()【】\[\]：:]/g, " ")
    .toLowerCase();
  const splitTerms = normalizedQuery
    .split(
      /\s+|について|とは|どこ|どれ|どの|どう|なに|何|です|ます|する|した|して|場合|とき|時|の|を|は|が|に|で|へ|や|も|から|まで|なら/g
    )
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
  const domainTerms = [
    "着座",
    "飛び",
    "日程調整",
    "返信なし",
    "リスケ",
    "事前キャンセル",
    "重複予約",
    "無効アポ",
    "成約",
    "成約予定",
    "保留",
    "失注",
    "クーリングオフ",
    "MLM",
    "クレジットカード",
    "クレカ",
    "銀行振込",
    "特別決済",
    "ライフティ",
    "契約書",
    "入金",
    "予約変更",
    "Lステップ",
    "当日トラブル",
    "代打",
    "議事録",
    "相談先",
    "決済リンク",
  ].filter((term) => query.includes(term));

  return [...new Set([...domainTerms, ...splitTerms])];
}

function queryMentionsSonoba(query: string) {
  return /【その場】|その場|Zoom|ズーム|入室後|面談中|口頭|すぐ|直後|商談動画/.test(
    query
  );
}

function lineConflictsWithQuery(line: string, query: string) {
  if (queryMentionsSonoba(query)) return false;
  return /【その場】|Zoom入室後|入室後すぐ|面談中にリスケ|商談動画提出必須/.test(line);
}

function getEvidenceLines(
  source: CombinedKnowledgeResult,
  query: string,
  limit = 6
) {
  const terms = createEvidenceTerms(query);
  const lines = source.excerpts
    .flatMap((excerpt) =>
      excerpt
        .split(/\n|。|！|!|\?|？/)
        .map(cleanExcerpt)
        .filter((line) => line.length >= 8)
    )
    .filter((line) => !/^https?:\/\//.test(line))
    .filter((line) => !lineConflictsWithQuery(line, query))
    .filter((line, index, list) => list.indexOf(line) === index);

  if (terms.length === 0) return lines.slice(0, limit);

  const ranked = lines
    .map((line) => {
      const normalizedLine = line.toLowerCase();
      const hitCount = terms.reduce(
        (count, term) => count + (normalizedLine.includes(term.toLowerCase()) ? 1 : 0),
        0
      );
      return { line, hitCount };
    })
    .filter((item) => item.hitCount > 0);

  if (ranked.length === 0) return lines.slice(0, limit);

  return ranked
    .sort((a, b) => b.hitCount - a.hitCount)
    .map((item) => item.line)
    .slice(0, limit);
}

function getUsefulExcerpts(source: CombinedKnowledgeResult, limit = 3) {
  return source.excerpts
    .map(cleanExcerpt)
    .filter((excerpt) => excerpt.length >= 8)
    .filter((excerpt) => !/^https?:\/\//.test(excerpt))
    .filter((excerpt, index, list) => list.indexOf(excerpt) === index)
    .slice(0, limit);
}

function buildBriefAnswer(source: CombinedKnowledgeResult) {
  const excerpts = getUsefulExcerpts(source, 3);

  if (excerpts.length === 0) {
    return `この件は「${source.sourceTitle}」の記事が一番近いです。詳細は記事内で確認できます。`;
  }

  return [
    `この件は「${source.sourceTitle}」の内容が近いです。記事上では、`,
    ...excerpts.map((excerpt) => `- ${excerpt}`),
    "という扱いになっています。",
  ].join("\n");
}

function buildKnowledgeAnswerV2(query: string, results: CombinedKnowledgeResult[]) {
  if (results.length === 0) {
    return [
      "今のナレッジでは、該当しそうな記事を見つけられませんでした。",
      "",
      "登録済みカテゴリ:",
      ...chatbotKnowledgeCategories.map((category) => {
        const count = chatbotKnowledgeSources.filter(
          (source) => source.category === category
        ).length;
        return `- ${category}: ${count}件`;
      }),
      `- OCR画像: ${getChatbotOcrResultCount()}件`,
      isChatbotRagReady() ? "- RAG: 有効" : "- RAG: 未生成",
    ].join("\n");
  }

  const primary = results[0];
  const related = results.slice(1);

  return [
    buildBriefAnswer(primary),
    "",
    `参考記事: ${getDisplayLink(primary)}`,
    ...(related.length
      ? [
          "",
          "近そうな記事:",
          ...related.map((source) => `- ${getDisplayLink(source)}`),
        ]
      : []),
  ].join("\n");
}

function buildChatContextV2(query: string, results: CombinedKnowledgeResult[]) {
  return results
    .slice(0, 3)
    .map((source, index) => {
      const excerpts = getEvidenceLines(source, query, 6)
        .map((excerpt) => `  - ${excerpt}`)
        .join("\n");

      return [
        `候補${index + 1}`,
        `タイトル: ${source.sourceTitle}`,
        `URL: ${getDisplayUrl(source.url)}`,
        excerpts ? `質問に関連する根拠行:\n${excerpts}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function appendVerifiedSourceLinksV2(
  text: string,
  results: CombinedKnowledgeResult[]
) {
  const sources = results.slice(0, 3).map((source) => ({
    title: source.sourceTitle,
    url: getDisplayUrl(source.url),
  }));
  const domainlessText = text.replace(
    /https?:\/\/[^/\s)]+(\/chatbot-knowledge\/[a-zA-Z0-9-]+)/g,
    "$1"
  );
  const normalizedText = sources.reduce((current, source) => {
    const leaf = source.url.split("/").filter(Boolean).at(-1);
    if (!leaf) return current;

    return current.replace(
      new RegExp(`(^|[\\s(])/${escapeRegExp(leaf)}\\b`, "g"),
      `$1${source.url}`
    );
  }, domainlessText);

  const linkedText = sources.reduce((current, source) => {
    const urlPattern = new RegExp(
      `(?<![\\]\\(\\w/:.-])${escapeRegExp(source.url)}`,
      "g"
    );
    return current.replace(
      urlPattern,
      formatMarkdownLink(source.title, source.url)
    );
  }, normalizedText);

  const clickableText = linkedText.replace(
    /(^|[\s　])(\/chatbot-knowledge\/[a-zA-Z0-9-]+)/g,
    (_match, prefix: string, url: string) => `${prefix}[${url}](${url})`
  );

  const sourceLines = sources
    .filter((source) => !clickableText.includes(`](${source.url})`))
    .map((source) => `- ${formatMarkdownLink(source.title, source.url)}`);

  if (sourceLines.length === 0) return clickableText;

  const heading = /参考記事[:：]/.test(clickableText)
    ? "ほかに近い記事:"
    : "参考記事:";

  return [`${clickableText.trim()}`, "", heading, ...sourceLines].join("\n");
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

function logQuestionIfNeeded({
  shouldLogQuestion,
  lastText,
  results,
  answerText,
}: {
  shouldLogQuestion: boolean;
  lastText: string;
  results: CombinedKnowledgeResult[];
  answerText?: string;
}) {
  if (!shouldLogQuestion || !lastText.trim()) return;

  const classification = classifyChatbotQuestion(lastText);

  appendChatbotQuestionLog({
    askedAt: new Date().toISOString(),
    majorCategory: classification.majorCategory,
    minorCategory: classification.minorCategory,
    questionText: lastText,
    answerStatus: answerText
      ? determineChatbotAnswerStatusFromAnswer({
          question: lastText,
          answer: answerText,
          matchedSourceCount: results.length,
        })
      : determineChatbotAnswerStatus(lastText, results.length),
    matchedSourceCount: results.length,
  });
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const lastText = extractLastUserText(messages);
  const results = await searchCombinedKnowledge(lastText, 5);
  const shouldLogQuestion =
    req.headers.get("x-levela-chatbot-surface") === "user";

  if (process.env.CHATBOT_LIVE_OPENAI === "false") {
    const answerText = buildKnowledgeAnswerV2(lastText, results);
    logQuestionIfNeeded({ shouldLogQuestion, lastText, results, answerText });

    return createTextResponse(messages, answerText);
  }

  if (!process.env.OPENAI_API_KEY) {
    const answerText = `${buildKnowledgeAnswerV2(
      lastText,
      results
    )}\n\n補足: OPENAI_API_KEY が未設定のため、ローカル検索結果を返しています。`;
    logQuestionIfNeeded({ shouldLogQuestion, lastText, results, answerText });

    return createTextResponse(messages, answerText);
  }

  try {
    const context = buildChatContextV2(lastText, results);
    const recentMessages = messages.slice(-6);
    const result = await generateText({
      model: openai(process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini"),
      system: [
        "あなたはLevelaの社内ナレッジ回答ボットです。",
        "必ず検索候補の本文抜粋だけを根拠にして、日本語で自然に短く回答してください。候補にない内容は推測で補わないでください。",
        "返答は必ず、1) 質問への短い回答、2) 参考記事リンク、の順にしてください。URLだけを返す回答は禁止です。",
        "参考記事は内部記事URLを優先し、/chatbot-knowledge/... の相対URLのまま出してください。Notion URLが内部記事化されている場合はNotion URLを出さないでください。",
        "ログイン情報、APIキー、カード番号、口座番号などの機密情報は出さないでください。",
        "あなたはLevelaの社内向けチャットボットです。返答は自然な日本語で、社内メンバーが次に見るべきページをすぐ分かるように案内してください。",
        "下の検索候補だけを根拠に回答してください。候補にない内容は推測で補わないでください。",
        "必ず候補にあるURLをそのまま含めてください。内部記事URLがある場合はNotion URLではなく内部記事URLを優先してください。ローカル画像パス、画像番号、OCRという言葉、署名付き画像URLは出さないでください。",
        "内部記事URLは /chatbot-knowledge/... のような相対URLのまま出してください。勝手にドメインを付けないでください。",
        "ログインID、パスワード、APIキー、カード番号、口座番号などの機密情報は出さないでください。",
        "回答は短めにしてください。目安は2〜5文。必要なら候補URLを2〜3件まで並べてください。",
        "毎回同じ枕詞にしないでください。ユーザーの聞き方に合わせて自然に返してください。",
        "「【その場】」と付くステータス条件は、ユーザーがその場・Zoom入室後・面談中の話をしている場合だけ使ってください。通常のステータスと混同しないでください。",
        "検索候補に複数条件が含まれる場合、質問文に明示された条件と一致する根拠行だけを使ってください。近いが条件が違う行は回答に混ぜないでください。",
        isChatbotRagReady()
          ? "検索候補はRAGの意味検索で抽出した本文チャンクを優先しています。質問と意味が近い本文だけを要約してください。"
          : "RAGインデックス未生成のため、キーワード検索候補を使っています。",
        results.length === 0
          ? "検索候補が0件の場合、挨拶や雑談には自然に返してください。社内ナレッジが必要な質問なら、カテゴリ一覧を出さずに、もう少し具体的なキーワードを聞いてください。"
          : "",
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

    const answerText = appendVerifiedSourceLinksV2(result.text, results);
    logQuestionIfNeeded({ shouldLogQuestion, lastText, results, answerText });

    return createTextResponse(messages, answerText);
  } catch (error) {
    const answerText = `${buildKnowledgeAnswerV2(lastText, results)}\n\n補足: ${
      error instanceof Error ? error.message : "OpenAI API 実行に失敗しました。"
    }`;
    logQuestionIfNeeded({ shouldLogQuestion, lastText, results, answerText });

    return createTextResponse(messages, answerText);
  }
}
