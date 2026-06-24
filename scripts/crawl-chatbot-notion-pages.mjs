import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NotionAPI } from "notion-client";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const pagesPath = path.join(rootDir, "data", "chatbot-notion-pages", "pages.json");
const assetDir = path.join(
  rootDir,
  "public",
  "chatbot-knowledge",
  "assets",
  "notion-crawl"
);

const notion = new NotionAPI();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compactNotionId(value) {
  const id = value.split("?")[0].split("/").filter(Boolean).at(-1) ?? value;
  return id.replace(/[^a-fA-F0-9]/g, "").slice(-32).toLowerCase();
}

function dashedNotionId(value) {
  const id = compactNotionId(value);
  if (id.length !== 32) return id;
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(
    16,
    20
  )}-${id.slice(20)}`;
}

function pageUrlFromId(id) {
  return `https://app.notion.com/p/${compactNotionId(id)}`;
}

function normalizeNotionUrl(url) {
  if (!url) return null;

  const id = compactNotionId(url);
  if (id.length !== 32) return null;

  if (
    url.startsWith("/p/") ||
    url.includes("notion.so/") ||
    url.includes("notion.site/") ||
    url.includes("app.notion.com/")
  ) {
    return pageUrlFromId(id);
  }

  return null;
}

function unwrapBlock(record) {
  return record?.value?.value ?? record?.value ?? record;
}

function plainText(richText = []) {
  return richText.map((segment) => segment?.[0] ?? "").join("");
}

function richTextToMarkdown(richText = []) {
  return richText
    .map((segment) => {
      const text = segment?.[0] ?? "";
      const annotations = segment?.[1] ?? [];
      let value = text;

      for (const annotation of annotations) {
        if (!Array.isArray(annotation)) continue;
        if (annotation[0] === "a" && annotation[1]) {
          value = `[${value}](${normalizeNotionUrl(annotation[1]) ?? annotation[1]})`;
        }
        if (annotation[0] === "b") {
          value = `**${value}**`;
        }
        if (annotation[0] === "c") {
          value = `\`${value}\``;
        }
        if (annotation[0] === "_") {
          value = `<span underline="true">${value}</span>`;
        }
      }

      return value;
    })
    .join("");
}

function colorToken(block) {
  const raw = block?.format?.block_color;
  if (!raw) return undefined;
  return raw.replace("_background", "_bg");
}

function withColor(line, block) {
  const color = colorToken(block);
  return color ? `${line} {color="${color}"}` : line;
}

function indentLines(lines, prefix = "\t") {
  return lines.map((line) => (line ? `${prefix}${line}` : line));
}

function uniqueLines(lines) {
  const result = [];
  let previous = null;

  for (const line of lines) {
    if (line && line === previous) continue;
    result.push(line);
    previous = line;
  }

  return result;
}

async function optimizeImage(bytes) {
  return sharp(bytes, { animated: false })
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();
}

async function writeImageFromDataUrl(dataUrl, filenameBase) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const fileName = `${filenameBase}.webp`;
  const bytes = await optimizeImage(Buffer.from(match[2], "base64"));
  await fs.writeFile(path.join(assetDir, fileName), bytes);
  return `/chatbot-knowledge/assets/notion-crawl/${fileName}`;
}

async function downloadImage(url, filenameBase) {
  if (!url) return null;
  if (url.startsWith("data:")) return writeImageFromDataUrl(url, filenameBase);

  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Image skipped: ${response.status} ${url}`);
    return null;
  }

  const fileName = `${filenameBase}.webp`;
  const bytes = await optimizeImage(Buffer.from(await response.arrayBuffer()));
  await fs.writeFile(path.join(assetDir, fileName), bytes);
  return `/chatbot-knowledge/assets/notion-crawl/${fileName}`;
}

function sourceUrlForImage(block, recordMap) {
  const signed = recordMap.signed_urls?.[block.id];
  if (signed) return signed;

  const source = block.properties?.source?.[0]?.[0];
  if (source) return source;

  return block.format?.display_source;
}

function extractLinkedNotionUrls(markdown) {
  const urls = new Set();
  const patterns = [
    /\]\(([^)]+)\)/g,
    /(https?:\/\/(?:app\.)?notion\.(?:so|com|site)\/[^\s)]+)/g,
    /(\/p\/[a-fA-F0-9]{32}[^\s)]*)/g,
  ];

  for (const pattern of patterns) {
    for (const match of markdown.matchAll(pattern)) {
      const normalized = normalizeNotionUrl(match[1]);
      if (normalized) urls.add(normalized);
    }
  }

  return [...urls];
}

function createRenderer({ blocks, recordMap, pageId, imageState }) {
  async function renderChildren(block, depth) {
    const childIds = block.content ?? [];
    const childLines = [];

    for (const childId of childIds) {
      const child = blocks[childId];
      if (!child) continue;
      childLines.push(...(await renderBlock(child, depth)));
    }

    return childLines;
  }

  async function renderImage(block) {
    const source = sourceUrlForImage(block, recordMap);
    if (!source) return [];

    imageState.count += 1;
    const hash = crypto
      .createHash("sha1")
      .update(`${block.id}:${source}`)
      .digest("hex")
      .slice(0, 10);
    const filenameBase = `${pageId}_${String(imageState.count).padStart(2, "0")}_${hash}`;
    const localPath = await downloadImage(source, filenameBase);
    return localPath ? [`![](${localPath})`] : [];
  }

  async function renderBlock(block, depth = 0) {
    const title = richTextToMarkdown(block.properties?.title);
    const children = await renderChildren(block, depth + 1);

    switch (block.type) {
      case "column":
      case "column_list":
        return children;
      case "page": {
        if (block.id === dashedNotionId(pageId)) return children;
        const label = richTextToMarkdown(block.properties?.title) || plainText(block.properties?.title);
        return label ? [`[${label}](${pageUrlFromId(block.id)})`, ...children] : children;
      }
      case "header":
        return [withColor(`# ${title}`, block), ...children];
      case "sub_header":
        return [withColor(`## ${title}`, block), ...children];
      case "sub_sub_header":
        return [withColor(`### ${title}`, block), ...children];
      case "toggle": {
        const level = depth <= 1 ? "#" : depth === 2 ? "##" : "###";
        return [withColor(`${level} ${title}`, block), ...children];
      }
      case "callout":
        return [
          `<callout color="${colorToken(block) ?? "gray_bg"}">`,
          ...(title ? [title] : []),
          ...children,
          "</callout>",
        ];
      case "text":
        return title ? [withColor(title, block), ...children] : children.length ? children : ["<empty-block/>"];
      case "bulleted_list":
        return [`- ${title}`, ...indentLines(children)];
      case "numbered_list":
        return [`1. ${title}`, ...indentLines(children)];
      case "quote":
        return [`> ${title}`, ...indentLines(children, "> ")];
      case "to_do": {
        const checked = block.properties?.checked?.[0]?.[0] === "Yes" ? "x" : " ";
        return [`- [${checked}] ${title}`, ...indentLines(children)];
      }
      case "divider":
        return ["---"];
      case "code":
        return ["```plain text", plainText(block.properties?.title), "```"];
      case "image":
        return [...(await renderImage(block)), ...children];
      case "bookmark":
      case "embed":
      case "video": {
        const link = block.properties?.link?.[0]?.[0] ?? block.format?.display_source;
        return link ? [`[${title || link}](${link})`, ...children] : children;
      }
      default:
        return title ? [title, ...children] : children;
    }
  }

  return { renderBlock };
}

async function renderPage(page) {
  const pageId = compactNotionId(page.url);
  const recordMap = await getPageWithRetry(pageId);
  const blocks = Object.fromEntries(
    Object.entries(recordMap.block ?? {}).map(([id, record]) => [id, unwrapBlock(record)])
  );
  const root = blocks[dashedNotionId(pageId)] ?? blocks[pageId];

  if (!root) {
    throw new Error(`Root block missing for ${page.title}`);
  }

  const imageState = { count: 0 };
  const renderer = createRenderer({ blocks, recordMap, pageId, imageState });
  const lines = uniqueLines(await renderer.renderBlock(root, 0));
  const markdown = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return {
    ...page,
    pageId,
    title: plainText(root.properties?.title) || page.title,
    markdown,
    blockCount: Object.keys(blocks).length,
    imageCount: imageState.count,
    fetchedAt: new Date().toISOString(),
  };
}

async function getPageWithRetry(pageId) {
  let lastError;

  for (const waitMs of [0, 2000, 6000, 15000, 30000]) {
    if (waitMs) await sleep(waitMs);

    try {
      return await notion.getPage(pageId);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("429") && !message.includes("Too Many Requests")) {
        throw error;
      }
      console.warn(`Rate limited for ${pageId}; retrying after ${waitMs || 1000}ms`);
    }
  }

  throw lastError;
}

async function main() {
  const input = JSON.parse(await fs.readFile(pagesPath, "utf8"));
  const seedPages = input.pages ?? [];
  const queue = seedPages.map((page) => ({
    ...page,
    url: normalizeNotionUrl(page.url) ?? page.url,
    category: page.category ?? "Notion",
  }));
  const queued = new Set(queue.map((page) => normalizeNotionUrl(page.url)).filter(Boolean));
  const results = [];
  const errors = [];

  await fs.rm(assetDir, { recursive: true, force: true });
  await fs.mkdir(assetDir, { recursive: true });

  for (let index = 0; index < queue.length; index += 1) {
    const page = queue[index];
    if (!page.url?.includes("app.notion.com")) continue;
    await sleep(750);

    try {
      const rendered = await renderPage(page);
      results.push(rendered);
      console.log(
        `[${index + 1}/${queue.length}] ${rendered.title} chars=${rendered.markdown.length} images=${rendered.imageCount} blocks=${rendered.blockCount}`
      );

      for (const linkedUrl of extractLinkedNotionUrls(rendered.markdown)) {
        if (queued.has(linkedUrl)) continue;
        queued.add(linkedUrl);
        queue.push({
          category: `${rendered.category ?? "Notion"} / linked`,
          title: linkedUrl,
          url: linkedUrl,
          source: "linked-notion-page",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ title: page.title, url: page.url, message });
      results.push(page);
      console.error(`[${index + 1}/${queue.length}] ERROR ${page.title}: ${message}`);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "notion-client",
    pages: results,
    errors,
  };

  await fs.writeFile(pagesPath, `${JSON.stringify(output, null, 2)}\n`);

  const chars = results.reduce((total, page) => total + (page.markdown?.length ?? 0), 0);
  const images = results.reduce((total, page) => total + (page.imageCount ?? 0), 0);
  console.log(`done pages=${results.length} errors=${errors.length} chars=${chars} images=${images}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
