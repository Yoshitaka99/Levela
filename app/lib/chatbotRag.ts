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
  kind: "notion" | "ocr";
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
        keywordBoost(trimmedQuery, `${chunk.title}\n${chunk.category}\n${chunk.text}`),
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
