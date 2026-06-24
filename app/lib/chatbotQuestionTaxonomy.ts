export type ChatbotQuestionAnswerStatus =
  | "answered"
  | "needs_review"
  | "unanswered";

export type ChatbotQuestionClassification = {
  majorCategory: string;
  minorCategory: string;
};

type Rule = ChatbotQuestionClassification & {
  keywords: string[];
};

export const chatbotQuestionAnswerStatusLabels: Record<
  ChatbotQuestionAnswerStatus,
  string
> = {
  answered: "回答済み",
  needs_review: "要確認",
  unanswered: "未回答",
};

export const chatbotQuestionMajorCategories = [
  {
    name: "ステータス・判定",
    minors: [
      "着座",
      "飛び",
      "日程変更",
      "事前キャンセル",
      "無効アポ",
      "重複予約",
      "担当者変更",
    ],
  },
  {
    name: "顧客対応",
    minors: [
      "返信文作成",
      "問い合わせ対応",
      "クレーム対応",
      "キャンセル対応",
      "未返信対応",
    ],
  },
  {
    name: "面談・予約",
    minors: [
      "Zoom案内",
      "日程調整",
      "リスケ対応",
      "面談前確認",
      "面談中トラブル",
      "面談後対応",
    ],
  },
  {
    name: "決済・請求",
    minors: [
      "着金確認",
      "決済リンク",
      "支払い方法",
      "ローン・分割",
      "請求書",
      "返金・キャンセル料",
    ],
  },
  {
    name: "営業フロー",
    minors: [
      "クロージング",
      "アウト返し",
      "商談準備",
      "ヒアリング",
      "成約後案内",
      "失注・保留対応",
    ],
  },
  {
    name: "ツール操作",
    minors: [
      "Lステップ",
      "顧客管理シート",
      "議事録",
      "Discord",
      "Notion",
      "Google Sheets",
    ],
  },
  {
    name: "社内ルール",
    minors: [
      "相談先",
      "組織図",
      "教育担当",
      "担当変更ルール",
      "報告ルール",
      "稼働ルール",
    ],
  },
  {
    name: "コンプライアンス",
    minors: [
      "NG表現",
      "なりすまし",
      "契約説明",
      "SNS運用注意",
      "個人情報",
      "法務確認",
    ],
  },
  {
    name: "資料検索",
    minors: [
      "資料の場所",
      "マニュアル検索",
      "ナレッジ確認",
      "動画・録画",
      "FAQ",
    ],
  },
  {
    name: "その他",
    minors: ["雑談", "分類不能", "要確認"],
  },
] as const;

const rules: Rule[] = [
  {
    majorCategory: "ステータス・判定",
    minorCategory: "着座",
    keywords: ["着座", "参加", "面談に来た", "入室", "来てくれた"],
  },
  {
    majorCategory: "ステータス・判定",
    minorCategory: "飛び",
    keywords: ["飛び", "来ない", "来なかった", "無断", "不参加"],
  },
  {
    majorCategory: "ステータス・判定",
    minorCategory: "日程変更",
    keywords: ["日程変更", "日程調整済", "リスケ", "再日程", "日時変更"],
  },
  {
    majorCategory: "ステータス・判定",
    minorCategory: "事前キャンセル",
    keywords: ["事前キャンセル", "キャンセル連絡", "面談前キャンセル"],
  },
  {
    majorCategory: "ステータス・判定",
    minorCategory: "無効アポ",
    keywords: ["無効アポ", "ブロック", "2時間以内", "重複予約"],
  },
  {
    majorCategory: "決済・請求",
    minorCategory: "着金確認",
    keywords: ["着金", "入金", "支払い完了", "決済完了"],
  },
  {
    majorCategory: "決済・請求",
    minorCategory: "決済リンク",
    keywords: ["決済リンク", "リンク送付", "決済url", "決済URL"],
  },
  {
    majorCategory: "決済・請求",
    minorCategory: "ローン・分割",
    keywords: ["ローン", "分割", "lifety", "ライフティ"],
  },
  {
    majorCategory: "決済・請求",
    minorCategory: "支払い方法",
    keywords: ["支払い方法", "カード", "銀行振込", "クレカ", "口座"],
  },
  {
    majorCategory: "決済・請求",
    minorCategory: "請求書",
    keywords: ["請求書", "領収書", "インボイス"],
  },
  {
    majorCategory: "決済・請求",
    minorCategory: "返金・キャンセル料",
    keywords: ["返金", "キャンセル料", "解約", "返金対応"],
  },
  {
    majorCategory: "顧客対応",
    minorCategory: "返信文作成",
    keywords: ["返信文", "返し方", "文面", "文章", "返信して"],
  },
  {
    majorCategory: "顧客対応",
    minorCategory: "問い合わせ対応",
    keywords: ["問い合わせ", "質問された", "聞かれた", "対応方法"],
  },
  {
    majorCategory: "顧客対応",
    minorCategory: "クレーム対応",
    keywords: ["クレーム", "怒って", "炎上", "トラブル"],
  },
  {
    majorCategory: "面談・予約",
    minorCategory: "Zoom案内",
    keywords: ["zoom", "Zoom", "入室", "ミーティング", "商談URL"],
  },
  {
    majorCategory: "面談・予約",
    minorCategory: "日程調整",
    keywords: ["日程調整", "予約変更", "予定変更", "空き日程"],
  },
  {
    majorCategory: "営業フロー",
    minorCategory: "クロージング",
    keywords: ["クロージング", "成約", "契約する", "決めてもらう"],
  },
  {
    majorCategory: "営業フロー",
    minorCategory: "アウト返し",
    keywords: ["アウト返し", "高い", "検討", "考えます", "断られ"],
  },
  {
    majorCategory: "営業フロー",
    minorCategory: "ヒアリング",
    keywords: ["ヒアリング", "聞き出す", "深掘り", "課題確認"],
  },
  {
    majorCategory: "ツール操作",
    minorCategory: "Lステップ",
    keywords: ["lステップ", "Lステップ", "エルステップ", "linestep"],
  },
  {
    majorCategory: "ツール操作",
    minorCategory: "顧客管理シート",
    keywords: ["顧客管理", "管理シート", "スプレッドシート", "シート"],
  },
  {
    majorCategory: "ツール操作",
    minorCategory: "議事録",
    keywords: ["議事録", "録画", "tl;dv", "tldv"],
  },
  {
    majorCategory: "社内ルール",
    minorCategory: "相談先",
    keywords: ["相談先", "誰に聞く", "確認先", "エスカレ"],
  },
  {
    majorCategory: "社内ルール",
    minorCategory: "担当変更ルール",
    keywords: ["担当変更", "担当者変更", "担当が変わる"],
  },
  {
    majorCategory: "コンプライアンス",
    minorCategory: "NG表現",
    keywords: ["ng表現", "NG表現", "言っていい", "言ったらダメ", "禁止"],
  },
  {
    majorCategory: "コンプライアンス",
    minorCategory: "なりすまし",
    keywords: ["なりすまし", "偽アカ", "偽垢", "詐欺"],
  },
  {
    majorCategory: "コンプライアンス",
    minorCategory: "個人情報",
    keywords: ["個人情報", "住所", "電話番号", "メールアドレス", "機密"],
  },
  {
    majorCategory: "資料検索",
    minorCategory: "資料の場所",
    keywords: ["資料", "どこ", "ページ", "リンク", "URL"],
  },
  {
    majorCategory: "資料検索",
    minorCategory: "マニュアル検索",
    keywords: ["マニュアル", "手順", "やり方", "操作方法"],
  },
  {
    majorCategory: "資料検索",
    minorCategory: "FAQ",
    keywords: ["faq", "FAQ", "よくある質問"],
  },
];

const reviewKeywords = [
  "返金",
  "解約",
  "キャンセル料",
  "クレーム",
  "炎上",
  "法務",
  "個人情報",
  "なりすまし",
  "詐欺",
  "契約",
  "例外",
];

function includesKeyword(text: string, keyword: string) {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

export function classifyChatbotQuestion(
  question: string
): ChatbotQuestionClassification {
  const normalized = question.replace(/\s+/g, " ").trim();

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => includesKeyword(normalized, keyword))) {
      return {
        majorCategory: rule.majorCategory,
        minorCategory: rule.minorCategory,
      };
    }
  }

  if (!normalized) {
    return {
      majorCategory: "その他",
      minorCategory: "分類不能",
    };
  }

  return {
    majorCategory: "その他",
    minorCategory: "要確認",
  };
}

export function determineChatbotAnswerStatus(
  question: string,
  matchedSourceCount: number
): ChatbotQuestionAnswerStatus {
  if (matchedSourceCount === 0) return "unanswered";

  if (reviewKeywords.some((keyword) => includesKeyword(question, keyword))) {
    return "needs_review";
  }

  return "answered";
}
