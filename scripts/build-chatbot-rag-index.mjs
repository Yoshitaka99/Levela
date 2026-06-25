import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const rootDir = process.cwd();
const notionPagesPath = path.join(rootDir, "data", "chatbot-notion-pages", "pages.json");
const ocrResultsPath = path.join(rootDir, "data", "chatbot-ocr", "ocr-results.json");
const coreSourcesPath = path.join(rootDir, "data", "chatbot-rag", "core-sources.json");
const outputDir = path.join(rootDir, "data", "chatbot-rag");
const outputPath = path.join(outputDir, "index.json");

loadLocalEnv(path.join(rootDir, ".env.local"));

const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const embeddingDimensions = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS || 512);
const maxChunkLength = Number(process.env.CHATBOT_RAG_CHUNK_SIZE || 1400);
const overlapLength = Number(process.env.CHATBOT_RAG_CHUNK_OVERLAP || 180);
const minChunkLength = Number(process.env.CHATBOT_RAG_MIN_CHUNK_SIZE || 80);
const batchSize = Number(process.env.CHATBOT_RAG_BATCH_SIZE || 64);

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is required to build chatbot RAG index.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

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

function stableId(...parts) {
  return crypto.createHash("sha1").update(parts.join("\n")).digest("hex").slice(0, 16);
}

function stripSecrets(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      return !(
        /(^|\s)(pw|pass|password|api[_ -]?key|secret|token)(\s|[:：=]|$)/i.test(line) ||
        /パスワード|ログインパスワード|新パスワード|認証情報|apiキー|シークレット|トークン/i.test(line) ||
        /メールアドレス[:：]\s*[^\s]+@[^\s]+/i.test(line)
      );
    })
    .join("\n");
}

function cleanMarkdown(markdown) {
  return stripSecrets(markdown)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 $2")
    .replace(/<empty-block\s*\/?>/g, "\n")
    .replace(/<\/?callout[^>]*>/g, "\n")
    .replace(/<\/?span[^>]*>/g, "")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoParagraphs(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
    )
    .filter(Boolean);

  const expanded = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChunkLength) {
      expanded.push(paragraph);
      continue;
    }

    const lines = paragraph.split(/\r?\n/);
    let current = "";
    for (const line of lines) {
      if ((current + "\n" + line).length > maxChunkLength && current.trim()) {
        expanded.push(current.trim());
        current = "";
      }
      current = [current, line].filter(Boolean).join("\n");
    }
    if (current.trim()) expanded.push(current.trim());
  }

  return expanded;
}

function chunkText(text) {
  const paragraphs = splitIntoParagraphs(text);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = [current, paragraph].filter(Boolean).join("\n\n");
    if (candidate.length <= maxChunkLength) {
      current = candidate;
      continue;
    }

    if (current.length >= minChunkLength) {
      chunks.push(current);
      const overlap = current.slice(-overlapLength);
      current = [overlap, paragraph].filter(Boolean).join("\n\n");
    } else {
      chunks.push(paragraph.slice(0, maxChunkLength));
      current = paragraph.slice(maxChunkLength - overlapLength);
    }
  }

  if (current.trim().length >= minChunkLength) chunks.push(current.trim());

  return chunks
    .map((chunk) => chunk.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim())
    .filter((chunk, index, list) => chunk.length >= minChunkLength && list.indexOf(chunk) === index);
}

function buildDocuments() {
  const notionData = loadJson(notionPagesPath, { pages: [] });
  const ocrData = loadJson(ocrResultsPath, { results: [] });
  const coreData = loadJson(coreSourcesPath, { sources: [] });
  const documents = [];

  for (const source of coreData.sources ?? []) {
    if (!source?.url || !source?.markdown?.trim()) continue;

    const title = source.title || "Core knowledge";
    const category = source.category || "Core";
    const body = [`# ${title}`, cleanMarkdown(source.markdown)].join("\n\n");

    for (const [index, text] of chunkText(body).entries()) {
      documents.push({
        id: stableId("core", source.url, String(index), text),
        kind: "core",
        sourceUrl: source.url,
        title,
        category,
        chunkIndex: index,
        text,
      });
    }
  }

  for (const page of notionData.pages ?? []) {
    if (!page?.url || !page?.markdown?.trim()) continue;

    const title = page.title || page.fetchedTitle || "Notion page";
    const category = page.category || "Notion";
    const body = [`# ${title}`, cleanMarkdown(page.markdown)].join("\n\n");

    for (const [index, text] of chunkText(body).entries()) {
      documents.push({
        id: stableId("notion", page.url, String(index), text),
        kind: "notion",
        sourceUrl: page.url,
        title,
        category,
        chunkIndex: index,
        text,
      });
    }
  }

  for (const item of ocrData.results ?? []) {
    const text = cleanMarkdown(item.ocr_text || "");
    if (!item?.source_url || text.length < minChunkLength) continue;

    const title = item.source_title || "OCR画像";
    for (const [index, chunk] of chunkText(text).entries()) {
      documents.push({
        id: stableId("ocr", item.source_url, String(item.image_index), String(index), chunk),
        kind: "ocr",
        sourceUrl: item.source_url,
        title,
        category: "OCR画像",
        chunkIndex: index,
        text: `画像${item.image_index} OCR:\n${chunk}`,
      });
    }
  }

  return documents;
}

async function createEmbeddingBatch(values, attempt = 1) {
  try {
    const result = await client.embeddings.create({
      model: embeddingModel,
      dimensions: embeddingDimensions,
      input: values,
      encoding_format: "float",
    });

    return result.data.map((item) => item.embedding);
  } catch (error) {
    if (attempt >= 4) throw error;
    const waitMs = 1000 * attempt * attempt;
    console.warn(`Embedding batch failed. Retrying in ${waitMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return createEmbeddingBatch(values, attempt + 1);
  }
}

async function main() {
  const documents = buildDocuments();
  if (documents.length === 0) {
    console.error("No chatbot knowledge documents found.");
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const chunks = [];
  for (let index = 0; index < documents.length; index += batchSize) {
    const batch = documents.slice(index, index + batchSize);
    const embeddings = await createEmbeddingBatch(batch.map((document) => document.text));

    for (const [batchIndex, document] of batch.entries()) {
      chunks.push({
        ...document,
        embedding: embeddings[batchIndex],
      });
    }

    console.log(`Embedded ${Math.min(index + batch.length, documents.length)} / ${documents.length}`);
  }

  const index = {
    generatedAt: new Date().toISOString(),
    model: embeddingModel,
    dimensions: embeddingDimensions,
    chunkCount: chunks.length,
    sourceCount: new Set(chunks.map((chunk) => chunk.sourceUrl)).size,
    chunks,
  };

  fs.writeFileSync(outputPath, JSON.stringify(index), "utf8");
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
