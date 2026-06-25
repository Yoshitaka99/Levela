import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

export type ChatbotRagSearchResult = {
  kind: "rag";
  title: string;
  sourceTitle: string;
  url: string;
  score: number;
  excerpts: string[];
  notes?: string[];
};

type ChatbotRagChunk = {
  id: string;
  kind: "core" | "notion" | "ocr";
  sourceUrl: string;
  title: string;
  category: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
};

type ChatbotRagIndex = {
  generatedAt: string;
  model: string;
  dimensions: number;
  chunkCount: number;
  sourceCount: number;
  chunks: ChatbotRagChunk[];
};

const RAG_INDEX_PATH = path.join(process.cwd(), "data", "chatbot-rag", "index.json");
const DEFAULT_RAG_SCORE_FLOOR = 0.18;
const SONOBA_PATTERN = /【その場】|その場|Zoom入室後|入室後すぐ|面談中|商談動画提出必須/;
const SONOBA_QUERY_PATTERN = /【その場】|その場|Zoom|ズーム|入室後|面談中|口頭|すぐ|直後|商談動画/;
const DOMAIN_TERMS = [
  "着座",
  "飛び",
  "日程調整",
  "返信なし",
  "リスケ",
  "事前キャンセル",
  "重複予約",
  "無効アポ",
  "営業マン都合キャンセル",
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
  "返信",
  "相談",
  "発行",
];
const STATUS_QUERY_PATTERN =
  /ステータス|着座|飛び|日程調整|返信|リスケ|キャンセル|重複予約|無効アポ|成約|成約予定|保留|失注|クーリングオフ|MLM/;
const CONSULT_QUERY_PATTERN = /誰|どこ|相談|相談先|問い合わせ|確認|発行|担当/;
const PAYMENT_QUERY_PATTERN =
  /決済|決済リンク|クレジットカード|クレカ|銀行振込|特別決済|ライフティ|契約|入金/;

let cachedIndex: ChatbotRagIndex | null | undefined;
let cachedClient: OpenAI | null = null;

function loadRagIndex() {
  if (cachedIndex !== undefined) return cachedIndex;

  try {
    cachedIndex = JSON.parse(fs.readFileSync(RAG_INDEX_PATH, "utf8")) as ChatbotRagIndex;
  } catch {
    cachedIndex = null;
  }

  return cachedIndex;
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!cachedClient) cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return cachedClient;
}

function dotProduct(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let total = 0;

  for (let index = 0; index < length; index += 1) {
    total += left[index] * right[index];
  }

  return total;
}

function vectorNorm(vector: number[]) {
  return Math.sqrt(vector.reduce((total, value) => total + value * value, 0));
}

function cosineSimilarity(left: number[], right: number[]) {
  const denominator = vectorNorm(left) * vectorNorm(right);
  if (!denominator) return 0;
  return dotProduct(left, right) / denominator;
}

function cleanExcerpt(text: string) {
  return text
    .replace(/^画像\d+\s+OCR:\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordBoost(query: string, text: string) {
  const terms = query
    .toLowerCase()
    .replace(/[！？?!。、,，.．「」『』（）()【】\[\]：:]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  if (terms.length === 0) return 0;

  const haystack = text.toLowerCase();
  const hitCount = terms.reduce(
    (count, term) => count + (haystack.includes(term) ? 1 : 0),
    0
  );

  return Math.min(hitCount * 0.015, 0.06);
}

function domainTermBoost(query: string, chunk: ChatbotRagChunk) {
  const haystack = `${chunk.title}\n${chunk.category}\n${chunk.text}`;
  const matchedTerms = DOMAIN_TERMS.filter(
    (term) => query.includes(term) && haystack.includes(term)
  );
  const titleMatches = matchedTerms.filter((term) => chunk.title.includes(term));

  return Math.min(matchedTerms.length * 0.025 + titleMatches.length * 0.025, 0.14);
}

function rulePenalty(query: string, chunk: ChatbotRagChunk) {
  const queryMentionsSonoba = SONOBA_QUERY_PATTERN.test(query);
  if (queryMentionsSonoba) return 0;

  return SONOBA_PATTERN.test(`${chunk.title}\n${chunk.text}`) ? 0.045 : 0;
}

function routingBoost(query: string, chunk: ChatbotRagChunk) {
  const haystack = `${chunk.title}\n${chunk.category}\n${chunk.text}`;
  let boost = 0;

  if (STATUS_QUERY_PATTERN.test(query) && chunk.category.includes("ステータス")) {
    boost += 0.12;
  }

  if (CONSULT_QUERY_PATTERN.test(query) && /相談|相談先|不明事項/.test(haystack)) {
    boost += 0.14;
  }

  if (PAYMENT_QUERY_PATTERN.test(query) && chunk.category.includes("決済")) {
    boost += 0.08;
  }

  return Math.min(boost, 0.2);
}

export function isChatbotRagReady() {
  const index = loadRagIndex();
  return Boolean(index?.chunks?.length);
}

export async function searchChatbotRag(
  query: string,
  options: { limit?: number; chunkLimit?: number; scoreFloor?: number } = {}
): Promise<ChatbotRagSearchResult[]> {
  const trimmedQuery = query.trim();
  const index = loadRagIndex();
  const client = getOpenAIClient();

  if (!trimmedQuery || !index?.chunks?.length || !client) return [];

  const embeddingResult = await client.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || index.model,
    dimensions: index.dimensions,
    input: trimmedQuery,
    encoding_format: "float",
  });
  const queryEmbedding = embeddingResult.data[0]?.embedding;
  if (!queryEmbedding) return [];

  const chunkLimit = options.chunkLimit ?? 18;
  const scoreFloor = options.scoreFloor ?? DEFAULT_RAG_SCORE_FLOOR;
  const scoredChunks = index.chunks
    .map((chunk) => ({
      chunk,
      score:
        cosineSimilarity(queryEmbedding, chunk.embedding) +
        keywordBoost(trimmedQuery, `${chunk.title}\n${chunk.category}\n${chunk.text}`) +
        domainTermBoost(trimmedQuery, chunk) -
        rulePenalty(trimmedQuery, chunk) +
        routingBoost(trimmedQuery, chunk),
    }))
    .filter((item) => item.score >= scoreFloor)
    .sort((a, b) => b.score - a.score)
    .slice(0, chunkLimit);

  const grouped = new Map<string, ChatbotRagSearchResult>();

  for (const { chunk, score } of scoredChunks) {
    const current = grouped.get(chunk.sourceUrl);
    const excerpt = cleanExcerpt(chunk.text);

    if (!current) {
      grouped.set(chunk.sourceUrl, {
        kind: "rag",
        title: chunk.title,
        sourceTitle: chunk.title,
        url: chunk.sourceUrl,
        score,
        excerpts: [excerpt],
        notes: [`RAG semantic score: ${score.toFixed(3)}`],
      });
      continue;
    }

    current.score = Math.max(current.score, score);
    current.excerpts = [...current.excerpts, excerpt]
      .filter(Boolean)
      .filter((value, index, list) => list.indexOf(value) === index)
      .slice(0, 5);
  }

  return [...grouped.values()]
    .sort((a, b) => b.score - a.score || a.sourceTitle.localeCompare(b.sourceTitle))
    .slice(0, options.limit ?? 5);
}
