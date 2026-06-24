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

const notionMarkdownOverrides: Record<string, string> = {
  "status-seated": [
    '# 着座 {color="yellow_bg"}',
    "面談に着座した。",
    '# **日程変更→着座** {color="yellow_bg"}',
    "###  判定基準",
    "- 一度日程変更になったお客様が、その後の面談に着座した場合",
    "- 担当者変更後の面談で、お客様が着座した場合",
    '# 飛び {color="gray_bg"}',
    "事前連絡なく面談に参加しなかった状態。",
    "### 判定基準",
    "- 面談開始後10分は待機する",
    "- 次に予定が詰まってない場合は15分待機",
    "- 追い連絡を実施する",
    "- 上記対応後も参加・返信がない場合",
    "### ⚠️注意事項",
    "- **追い連絡は必ずフローに従う**",
    "- 10分未満で離脱した場合は飛び判定不可",
    '# 事前キャンセル {color="red_bg"}',
    "面談開始前にお客様からキャンセル連絡があった状態。",
    '# 【その場】事前キャンセル {color="red_bg"}',
    "面談に着座後、入室してすぐにキャンセル希望となった状態。",
    "### 判定基準",
    "- Zoom入室済み",
    "- キャンセル意思を表明",
    "### ⚠️注意事項",
    "- **商談動画提出必須**",
    '# リスケ／再日程調整中 {color="green_bg"}',
    "面談前にお客様から日程変更依頼があり、新しい日程を調整している状態。",
    "### ⚠️注意事項",
    "- まだ新しい予約は確定していない",
    '# 【その場】リスケ／日程調整中 {color="green_bg"}',
    "着座後、時間の都合や事情によりその場で日程変更となった状態。",
    "### 判定基準",
    "- Zoom入室済み",
    "- 面談中にリスケ希望",
    "### ⚠️注意事項",
    "- **商談動画提出必須**",
    '# 日程調整済 {color="gray_bg"}',
    "日程変更後、新しい面談日時が確定している状態。",
    "### 判定基準",
    "- 再予約完了",
    "- 日時確定済み",
    '# 日程調整中 → 返信なし {color="yellow_bg"}',
    "リスケ調整中だったが、お客様から返信が途絶えた状態。",
    "### 判定基準",
    "- 最終連絡から3日以上返信なし",
    '# 【その場】日程調整済 {color="gray_bg"}',
    "着座後、入室してすぐに口頭で日程変更を希望された場合→日時が確定している",
    "### ⚠️注意事項",
    "- **商談動画提出必須**",
    '# 【その場】日程調整→返信なし {color="yellow_bg"}',
    "着座後、入室してすぐに口頭で日程変更を希望された場合→日程調整中だったが、3日間返信がなかった",
    "### ⚠️注意事項",
    "- **商談動画提出必須**",
    '# 担当者変更 {color="purple_bg"}',
    "担当営業が変更になった状態。",
    "日程調整リンクを送って自動で担当者が変わった場合も含む",
    '# 重複予約 {color="purple_bg"}',
    "同一顧客の予約が重複して登録されている状態。",
    "### 判定基準",
    "- 顧客管理シートに複数表示",
    "- 顧客管理シート内で同名の方のアポがあるか目視必須",
    "### 注意事項",
    '# 無効アポ {color="purple_bg"}',
    "予約後すぐにキャンセルまたはブロック",
    "### 判定基準",
    "- 予約から約2時間以内",
    "---",
    '# 営業マン都合キャンセル {color="red_bg"}',
    "営業側の都合で面談実施ができなかった状態",
    "### 例",
    "- 寝坊",
    "- 面談忘れ",
    "- 体調不良",
  ].join("\n"),
};

const articles: ChatbotInternalArticle[] = chatbotKnowledgeSources.map((source) => {
  if (source.id === "payment-method") return paymentMethodArticle;

  const articleMarkdown = notionMarkdownOverrides[source.id] ?? source.content;

  return {
    slug: source.id,
    title: source.title,
    category: source.category,
    sourceUrl: source.url,
    internalPath: `/chatbot-knowledge/${source.id}`,
    blocks: [
      {
        type: "text",
        markdown: articleMarkdown,
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
