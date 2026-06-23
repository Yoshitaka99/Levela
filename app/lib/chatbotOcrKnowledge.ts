import fs from "node:fs";
import path from "node:path";
import type { ChatbotKnowledgeCategory } from "./chatbotKnowledgeSources";

type RawOcrResult = {
  source_title: string;
  source_url: string;
  image_index: number;
  local_path: string;
  ocr_text: string;
};

export type ChatbotOcrSearchResult = {
  id: string;
  category: ChatbotKnowledgeCategory;
  title: string;
  sourceTitle: string;
  url: string;
  imageIndex: number;
  imagePath: string;
  score: number;
  excerpts: string[];
};

type OcrSearchOptions = {
  category?: ChatbotKnowledgeCategory;
  limit?: number;
};

const OCR_RESULTS_PATH = path.join(
  process.cwd(),
  "data",
  "chatbot-ocr",
  "ocr-results.json"
);

const SOURCE_META: Record<
  string,
  { category: ChatbotKnowledgeCategory; title: string }
> = {
  "https://app.notion.com/p/58d66ab3bdd082c8ad6e01a283e00a4b": {
    category: "ステータス",
    title: "その他ステータス",
  },
  "https://app.notion.com/p/42866ab3bdd0838eb3af818668c5de0a": {
    category: "ステータス",
    title: "アポ追加注意事項 / 注意【必ず見て】",
  },
  "https://app.notion.com/p/a5366ab3bdd08386886f81efd3993067": {
    category: "決済",
    title: "決済方法 / 決済の種類",
  },
  "https://app.notion.com/p/f7766ab3bdd082a1aaf60164ab5e0562": {
    category: "決済",
    title: "契約作業 / 契約作業〜入金対応",
  },
  "https://app.notion.com/p/90766ab3bdd082a0946e0149bb9fb0e6": {
    category: "決済",
    title: "契約時よくある質問 / 契約&決済よくある質問",
  },
  "https://app.notion.com/p/2fd66ab3bdd0838ea56c8105f56a7f4f": {
    category: "決済",
    title: "クーリングオフについて / クーリングオフ対応",
  },
  "https://app.notion.com/p/99466ab3bdd083d6a943815e9678fdfd": {
    category: "Lステップ操作",
    title: "予約変更 / 予約キャンセル・予約変更方法",
  },
};

const SEARCH_SYNONYMS: Record<string, string[]> = {
  クレカ: ["クレジットカード", "カード"],
  クレジット: ["クレジットカード", "カード"],
  カード: ["クレジットカード", "クレカ"],
  振込: ["銀行振込", "銀行"],
  銀行: ["銀行振込", "振込"],
  ライフティ: ["信販", "割賦"],
  信販: ["ライフティ", "割賦"],
  割賦: ["ライフティ", "信販"],
  クーリング: ["クーリングオフ", "解除"],
  クラウドサイン: ["cloudsign", "契約書"],
  契約書: ["クラウドサイン", "cloudsign"],
  アポ: ["予約", "個別相談"],
  予約: ["アポ", "個別相談"],
  リマインド: ["予約変更", "キャンセル"],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function createSearchTerms(query: string) {
  const normalizedQuery = normalize(query);
  const baseTerms = normalizedQuery
    .replace(/[！？?!。、,，.．「」『』（）()【】\[\]：:]/g, " ")
    .split(/\s+|について|とは|どこ|どれ|どの|どう|なに|何|です|ます|する|した|して|場合|とき|時|の|を|は|が|に|で|へ|や|も|から|まで|なら/g)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  const synonymTerms = Object.entries(SEARCH_SYNONYMS).flatMap(
    ([term, synonyms]) =>
      normalizedQuery.includes(normalize(term))
        ? [normalize(term), ...synonyms.map(normalize)]
        : []
  );

  return [...new Set([normalizedQuery, ...baseTerms, ...synonymTerms])].filter(
    Boolean
  );
}

function loadOcrResults(): RawOcrResult[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(OCR_RESULTS_PATH, "utf8")) as {
      results?: RawOcrResult[];
    };
    return Array.isArray(parsed.results) ? parsed.results : [];
  } catch {
    return [];
  }
}

function createExcerpts(text: string, terms: string[]) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (terms.length === 0) return lines.slice(0, 4);

  const matched = lines.filter((line) => {
    const normalizedLine = normalize(line);
    return terms.some((term) => normalizedLine.includes(term));
  });

  return (matched.length > 0 ? matched : lines).slice(0, 5);
}

export function searchChatbotOcrResults(
  query: string,
  options: OcrSearchOptions = {}
): ChatbotOcrSearchResult[] {
  const normalizedQuery = normalize(query);
  const terms = createSearchTerms(query);
  const limit = options.limit ?? 5;

  return loadOcrResults()
    .map((item) => {
      const meta = SOURCE_META[item.source_url] ?? {
        category: "その他" as const,
        title: item.source_title || "OCR画像",
      };

      const title = meta.title;
      const haystack = normalize(
        [
          meta.category,
          title,
          item.source_title,
          item.source_url,
          item.ocr_text,
          `画像 ${item.image_index}`,
        ].join(" ")
      );

      const directScore =
        normalizedQuery && haystack.includes(normalizedQuery) ? 16 : 0;
      const titleScore =
        normalizedQuery &&
        normalize(title).includes(normalizedQuery)
          ? 10
          : 0;
      const termScore = terms.reduce(
        (score, term) => score + (haystack.includes(term) ? 4 : 0),
        0
      );
      const score = directScore + titleScore + termScore;

      return {
        id: `${item.source_url}#image-${item.image_index}`,
        category: meta.category,
        title: `${title} / 画像${item.image_index}`,
        sourceTitle: title,
        url: item.source_url,
        imageIndex: item.image_index,
        imagePath: item.local_path,
        score,
        excerpts: createExcerpts(item.ocr_text, terms),
      };
    })
    .filter(
      (item) =>
        (!options.category || item.category === options.category) &&
        (item.score > 0 || !normalizedQuery)
    )
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function getChatbotOcrResultCount() {
  return loadOcrResults().length;
}
