import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const rootDir = process.cwd();
const indexPath = path.join(rootDir, "data", "chatbot-rag", "index.json");
const casesPath = path.join(rootDir, "data", "chatbot-rag", "eval-cases.json");

loadLocalEnv(path.join(rootDir, ".env.local"));

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is required to evaluate chatbot RAG retrieval.");
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const evalCases = JSON.parse(fs.readFileSync(casesPath, "utf8")).cases ?? [];
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

function loadLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;

    const [key, ...valueParts] = line.split("=");
    if (!key || process.env[key]) continue;

    let value = valueParts.join("=").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function dotProduct(left, right) {
  const length = Math.min(left.length, right.length);
  let total = 0;
  for (let index = 0; index < length; index += 1) total += left[index] * right[index];
  return total;
}

function vectorNorm(vector) {
  return Math.sqrt(vector.reduce((total, value) => total + value * value, 0));
}

function cosineSimilarity(left, right) {
  const denominator = vectorNorm(left) * vectorNorm(right);
  return denominator ? dotProduct(left, right) / denominator : 0;
}

function keywordBoost(query, text) {
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

function domainTermBoost(query, chunk) {
  const haystack = `${chunk.title}\n${chunk.category}\n${chunk.text}`;
  const matchedTerms = DOMAIN_TERMS.filter(
    (term) => query.includes(term) && haystack.includes(term)
  );
  const titleMatches = matchedTerms.filter((term) => chunk.title.includes(term));

  return Math.min(matchedTerms.length * 0.025 + titleMatches.length * 0.025, 0.14);
}

function rulePenalty(query, chunk) {
  if (SONOBA_QUERY_PATTERN.test(query)) return 0;
  return SONOBA_PATTERN.test(`${chunk.title}\n${chunk.text}`) ? 0.045 : 0;
}

function routingBoost(query, chunk) {
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

async function embedQuery(query) {
  const result = await client.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || index.model,
    dimensions: index.dimensions,
    input: query,
    encoding_format: "float",
  });
  return result.data[0].embedding;
}

function rankSources(query, queryEmbedding) {
  const grouped = new Map();

  for (const chunk of index.chunks) {
    const score =
      cosineSimilarity(queryEmbedding, chunk.embedding) +
      keywordBoost(query, `${chunk.title}\n${chunk.category}\n${chunk.text}`) +
      domainTermBoost(query, chunk) -
      rulePenalty(query, chunk) +
      routingBoost(query, chunk);
    const current = grouped.get(chunk.sourceUrl);
    if (!current || current.score < score) {
      grouped.set(chunk.sourceUrl, {
        title: chunk.title,
        sourceUrl: chunk.sourceUrl,
        score,
      });
    }
  }

  return [...grouped.values()].sort((a, b) => b.score - a.score).slice(0, 5);
}

let failures = 0;

for (const item of evalCases) {
  const queryEmbedding = await embedQuery(item.query);
  const ranked = rankSources(item.query, queryEmbedding);
  const titles = ranked.map((result) => result.title);
  const matched = item.expectedTitleIncludes.some((expected) =>
    titles.some((title) => title.includes(expected))
  );

  if (!matched) failures += 1;

  console.log(
    JSON.stringify(
      {
        id: item.id,
        ok: matched,
        expectedTitleIncludes: item.expectedTitleIncludes,
        topTitles: ranked.map((result) => ({
          title: result.title,
          score: Number(result.score.toFixed(3)),
        })),
      },
      null,
      2
    )
  );
}

if (failures > 0) {
  console.error(`${failures} chatbot RAG eval case(s) failed.`);
  process.exit(1);
}

console.log(`All ${evalCases.length} chatbot RAG eval case(s) passed.`);
