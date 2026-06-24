import fs from "node:fs";
import path from "node:path";
import { chatbotKnowledgeSources } from "./chatbotKnowledgeSources";

export type ChatbotInternalArticleBlock =
  | {
      type: "text";
      markdown: string;
    }
  | {
      type: "image";
      src: string;
      alt: string;
    }
  | {
      type: "link";
      href: string;
      label: string;
    }
  | {
      type: "empty";
    };

export type ChatbotInternalArticle = {
  slug: string;
  title: string;
  category: string;
  sourceUrl: string;
  internalPath: string;
  blocks: ChatbotInternalArticleBlock[];
};

type RawOcrResult = {
  source_title: string;
  source_url: string;
  image_index: number;
  local_path: string;
  ocr_text?: string;
};

const OCR_RESULTS_PATH = path.join(
  process.cwd(),
  "data",
  "chatbot-ocr",
  "ocr-results.json"
);

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

const imageBlocksBySourceUrl = loadOcrResults().reduce<
  Record<string, ChatbotInternalArticleBlock[]>
>((grouped, item) => {
  const fileName = path.basename(item.local_path);
  const blocks = grouped[item.source_url] ?? [];

  blocks.push({
    type: "image",
    src: `/chatbot-knowledge/assets/${fileName}`,
    alt: `${item.source_title} 画像${item.image_index}`,
  });

  grouped[item.source_url] = blocks;
  return grouped;
}, {});

const paymentMethodArticle: ChatbotInternalArticle = {
  slug: "payment-method",
  title: "決済方法",
  category: "決済",
  sourceUrl: "https://app.notion.com/p/a5366ab3bdd08386886f81efd3993067",
  internalPath: "/chatbot-knowledge/payment-method",
  blocks: [
    {
      type: "text",
      markdown:
        '**①銀行振込一括**<br>⚠️振込手数料はお客様負担 {color="pink_bg"}',
    },
    {
      type: "image",
      src: "/chatbot-knowledge/assets/a5366ab3bdd08386886f81efd3993067_01_72dcb345f1.png",
      alt: "①銀行振込一括",
    },
    {
      type: "text",
      markdown:
        '**②クレジットカード一括払い**<br>（あとから分割）<br>⚠️クレカの枠があるかは事前に確認すること {color="pink_bg"}',
    },
    {
      type: "image",
      src: "/chatbot-knowledge/assets/a5366ab3bdd08386886f81efd3993067_02_7169e64593.png",
      alt: "②クレジットカード一括払い",
    },
    {
      type: "text",
      markdown:
        '**③特別決済<br>**⚠️ベージックの場合は入会金が無料。<br>コミットの場合は入会金５万円かかります❗️ {color="pink_bg"}',
    },
    {
      type: "image",
      src: "/chatbot-knowledge/assets/a5366ab3bdd08386886f81efd3993067_03_62bd6aace0.png",
      alt: "③特別決済",
    },
    {
      type: "text",
      markdown:
        '**④ライフティ**<br>⚠️無職・専業主婦の場合は通らない {color="pink_bg"}',
    },
    {
      type: "image",
      src: "/chatbot-knowledge/assets/a5366ab3bdd08386886f81efd3993067_04_8fbbf513e7.png",
      alt: "④ライフティ",
    },
    {
      type: "text",
      markdown:
        "**⑤イレギュラー決済**<br>⚠️他に手段がなくなった場合のみ<br>→注意点が多いためしっかり確認すること {color=\"blue_bg\"}",
    },
    {
      type: "link",
      href: "https://app.notion.com/p/221f082e36c2802b8014fff009a3c4c7",
      label: "https://app.notion.com/p/221f082e36c2802b8014fff009a3c4c7",
    },
    { type: "empty" },
    { type: "empty" },
  ],
};

const articles: ChatbotInternalArticle[] = chatbotKnowledgeSources.map((source) => {
  if (source.id === "payment-method") return paymentMethodArticle;

  return {
    slug: source.id,
    title: source.title,
    category: source.category,
    sourceUrl: source.url,
    internalPath: `/chatbot-knowledge/${source.id}`,
    blocks: [
      {
        type: "text",
        markdown: source.content,
      },
      ...(source.notes ?? []).filter(shouldShowArticleNote).map(
        (note): ChatbotInternalArticleBlock => ({
          type: "text",
          markdown: note,
        })
      ),
      ...(imageBlocksBySourceUrl[source.url] ?? []),
    ],
  };
});

function shouldShowArticleNote(note: string) {
  return /https?:\/\//.test(note);
}

export function getInternalArticleBySlug(slug: string) {
  return articles.find((article) => article.slug === slug) ?? null;
}

export function getInternalArticlePathForSourceUrl(sourceUrl: string) {
  return articles.find((article) => article.sourceUrl === sourceUrl)?.internalPath ?? null;
}

export function listInternalArticles() {
  return articles;
}
