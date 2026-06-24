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

type RawNotionPage = {
  title?: string;
  category?: string;
  url: string;
  markdown: string;
};

const OCR_RESULTS_PATH = path.join(
  process.cwd(),
  "data",
  "chatbot-ocr",
  "ocr-results.json"
);
const NOTION_PAGES_PATH = path.join(
  process.cwd(),
  "data",
  "chatbot-notion-pages",
  "pages.json"
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

function loadNotionPages(): RawNotionPage[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(NOTION_PAGES_PATH, "utf8")) as {
      pages?: RawNotionPage[];
    };
    return Array.isArray(parsed.pages) ? parsed.pages : [];
  } catch {
    return [];
  }
}

const rawNotionPages = loadNotionPages();

const notionMarkdownBySourceUrl = rawNotionPages.reduce<Record<string, string>>(
  (grouped, page) => {
  if (page.url && page.markdown?.trim()) {
    grouped[page.url] = page.markdown;
  }

  return grouped;
  },
  {}
);

function slugifyNotionUrl(url: string) {
  const id = url.split("?")[0].split("/").filter(Boolean).at(-1) ?? url;
  return `portal-${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32)}`;
}

function normalizeNotionUrlForLookup(url: string) {
  const id = url
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/[^a-fA-F0-9]/g, "")
    .slice(-32)
    .toLowerCase();

  if (!id || id.length !== 32) return null;

  if (
    url.startsWith("/p/") ||
    url.includes("notion.so/") ||
    url.includes("notion.site/") ||
    url.includes("app.notion.com/")
  ) {
    return `https://app.notion.com/p/${id}`;
  }

  return null;
}

const imageBlocksBySourceUrl = loadOcrResults().reduce<
  Record<string, ChatbotInternalArticleBlock[]>
>((grouped, item) => {
  const fileName = item.local_path.replace(/\\/g, "/").split("/").at(-1);
  const blocks = grouped[item.source_url] ?? [];

  if (!fileName) return grouped;

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
  "status-appointment-notes": [
    "### ⚠️ ステータス管理で特に多いミス",
    "ステータスミスは数値ズレや対応漏れの原因になります。",
    "**必ず下記ルールを確認し、運用を統一してください。**",
    "---",
    '# ① 顧客管理シートに顧客の名前がない場合 {color="brown_bg"}',
    "面談したお客様の名前が顧客管理シートに存在しない場",
    "### 対応",
    "✅ 顧客管理シートの**アポ追加フォームから必ず登録する**",
    "![](notion-image-1)",
    "<empty-block/>",
    "### 注意事項",
    "- 登録漏れは集計漏れ・売上漏れの原因になります",
    "- 「後でやる」は禁止",
    '# ② アポ追加フォームの名前入力ルール {color="brown_bg"}',
    "### 正しい入力",
    "✅ カレンダーに登録されている正式名",
    "### 間違った入力",
    "❌ LINE名",
    "❌ ニックネーム",
    "❌ 絵文字付きの名前",
    "![](notion-image-2)",
    "### 目的",
    "顧客管理シートとの照合ミスを防ぐため",
    '# **③ 同じ顧客が複数登録されている場合** {color="brown_bg"}',
    "再アポや日程変更によって、同じお客様の名前が複数存在する場合",
    "### 対応",
    "✅ 1つのレコードのみで管理",
    "✅ ２つ以上ある場合、他は「重複予約」へ変更",
    "![](notion-image-3)",
    "### 注意事項",
    "- 同じお客様を複数管理しない",
    "- 数値の重複計上防止",
    '# ④ 日程調整済みの放置は禁止 {color="brown_bg"}',
    "ステータスが「日程調整済」のままになっているケースが多発しています。",
    "⬇️誤った入力❌",
    "![](notion-image-4)",
    "⬇️正しい入力⭕️",
    "![](notion-image-5)",
    "- 大前提、顧客管理シートに同じ顧客が出てきた場合、他は重複予約",
    "- 日程調整済のまま放置しない",
    "- 「日程調整済」→必ずステータス変更する",
    '# ⑤ 見送り連絡が来たら保留のままにしない {color="brown_bg"}',
    "お客様から辞退・見送り連絡があった場合",
    "### 対応",
    "✅ 速やかに「保留→失注」へ変更",
    "### 注意事項",
    "❌ 保留のまま放置しない",
    '# ⑥ 着金前に成約へ変更しない {color="brown_bg"}',
    "### 成約の定義",
    "✅ 入金確認完了",
    "### 成約ではない例",
    "- 契約書のみ締結",
    "- 支払い予定",
    "- 振込予定",
    "- カード増枠待ち",
    "- ライフティ審査待ち",
    "### 正しいステータス",
    "- 契約書締結済 → 成約予定（契あり）",
    "- ライフティ審査待ち → 成約予定（ライフティ）",
    "### 注意事項",
    "❌ 着金前に成約へ変更しない",
    "❌ 「払うと言っているから成約」はNG",
    "### 理由",
    "売上数値・成約率・管理データがすべてズレるため",
    "---",
    "# 🚨 最重要",
    "### ステータスは自己判断で変更しない",
    "迷った場合は必ず確認してください。",
    "**「なんとなく」で変更するのではなく、ステータス定義に沿って統一運用を徹底しましょう。**",
    "<empty-block/>",
  ].join("\n"),
  "status-no-show-flow": [
    "**前提**",
    "- 顧客都合で商談開始時刻から10分以上経過しても入室がない場合、営業担当者は日程変更を提案することができる",
    '- <span color="red">**次に商談が詰まっていない場合は最低15分待機する**</span>',
    "**対応手順**",
    '1. 開始時刻から10分<span color="red">（15分）</span>経過した時点で、顧客へ以下のメッセージを送信',
    '<callout color="gray_bg">',
    "**【顧客へ送るメッセージ例】**",
    "> 〇〇様<br>お疲れ様です。<br>本日〇時からお約束しておりました商談のお時間ですが、ご入室が確認できておりません。<br>何かトラブル等ございましたでしょうか？<br>5分ほどお待ちしておりますが、もしご都合が悪くなられた場合は、改めて日程を調整させていただければと思います。<br>ご連絡お待ちしております。",
    "</callout>",
    '2. さらに5分<span color="red">（10分）</span>（開始時刻から計10分<span color="red">（15分）</span>）待機',
    '3. 10分<span color="red">（15分）</span>経過時点で連絡・入室がない場合は、日程変更を提案',
    '<callout color="gray_bg">',
    "**【日程変更提案メッセージ例】**",
    "> 〇〇様<br>本日はご都合が合わなかったようですので、改めて別の日程で調整させていただければと思います。<br>以下のリンクより、ご都合の良い日時をお選びいただけますでしょうか？<br>\\[日程調整リンク\\]<br>何かご不明点等ございましたら、お気軽にご連絡ください。",
    "</callout>",
    "4. 顧客から返信があった場合は、速やかに日程調整を完了させる",
    "**注意事項**",
    "- 顧客を責めるような表現は使わない",
    "- あくまで丁寧に、相手の事情を配慮した対応を心がける",
    "- 独断でキャンセル扱いにはせず、必ず日程変更の提案を行う",
    "<empty-block/>",
    "<empty-block/>",
  ].join("\n"),
  "status-other": [
    '#### データをもとに分析を行うので、正確な内容を記載してください {color="brown_bg"}',
    '### **次回振込（要資金準備）** {color="red_bg"}',
    "資金が準備ができ次第の決済になる場合（株や証券を解約する、給料日を待つなど）",
    '### **次回振込（手続き待ち）** {color="red_bg"}',
    "入金予定日が決まっている場合",
    '### **次回カード決済（上限額up）** {color="red_bg"}',
    "カードの限度額の増枠申請をしている場合",
    '### **次回カード決済（新規作成）** {color="red_bg"}',
    "カード新規作成中の場合",
    '### **次回カード決済（エラーにより再決済）** {color="red_bg"}',
    "システムエラーによりその場で決済ができなかった場合",
    '### **次回入金作業** {color="red_bg"}',
    "決済のための再商談日が確定している場合",
    "<empty-block/>",
    '# **成約予定NA** {toggle="true"}',
    '### **次回振込（要資金準備）** {color="red_bg"}',
    "資金が準備ができ次第の決済になる場合（株や証券を解約する、給料日を待つなど）",
    '### **次回振込（手続き待ち）** {color="red_bg"}',
    "入金予定日が決まっている場合",
    '### **次回カード決済（上限額up）** {color="red_bg"}',
    "カードの限度額の増枠申請をしている場合",
    '### **次回カード決済（新規作成）** {color="red_bg"}',
    "カード新規作成中の場合",
    '### **次回カード決済（エラーにより再決済）** {color="red_bg"}',
    "システムエラーによりその場で決済ができなかった場合",
    '### **次回入金作業** {color="red_bg"}',
    "決済のための再商談日が確定している場合",
    '# **成約予定日** {toggle="true"}',
    "着金予定日を記入してください。",
    '# **決着日(成約or失注)** {toggle="true"}',
    "着金した日付を記載してください。",
    '# **支払方法** {toggle="true"}',
    '### **一括（振込）** {color="red_bg"}',
    "銀行振込一括払い",
    '### **一括（カード）** {color="red_bg"}',
    "クレジットカード一括払い（あとから分割）",
    '### **一括（振込＋カード）** {color="red_bg"}',
    "特別決済（銀行振込＋クレジットカード）",
    '### **一括（カード複数枚）** {color="red_bg"}',
    "イレギュラー対応（クレカ複数枚＋残金銀行振込した場合/基本的にないです）",
    '### ライフティ払い {color="red_bg"}',
    "ライフティ決済を使用した場合",
    '# **失注理由記載** {toggle="true"}',
    "**失注理由を選択してください**",
    "![](notion-image-1)",
    '# 失注理由詳細 {toggle="true"}',
    "失注理由の詳細を記載してください。",
    "<empty-block/>",
    "例えば「金額アウト」でも、状況によって理由が異なります。",
    "- 本当にお金がなかった場合→金額アウト",
    "- 払おうと思えば払えるが、この金額を出す勇気が出なかった場合→ヒアリング、クロージングが甘かった",
    "<empty-block/>",
    "「第三者によるアウト」も同様です。",
    "- 旦那に相談してそのまま反対された→一人で決断できるほどスクールの魅力や費用対効果を伝えられなかった。不安を拭えなかった。断り文句として「旦那に相談しないと決められない」と言われてしまった",
    '### <span color="red">このように複数のパターンがあります。</span>',
    '### <span color="red">自責で捉えて次回の商談までに改善しましょう！</span>',
    '# 保留理由詳細 {toggle="true"}',
    "保留🟰失注なので、基本保留はないはずです。",
    "<empty-block/>",
  ].join("\n"),
  "status-after-session": [
    '# 成約 {color="red_bg"}',
    "初回zoom内で決済まで終了した場合",
    "例）銀行振込一括払いで、Zoom内でネットバンキングを使い入金まで完了した",
    "### ⚠️注意事項",
    "- 必ず入金確認まで完了していること",
    "- 入金未完了の場合は成約予定へ",
    '# **成約予定（契あり）** {color="red_bg"}',
    "契約書締結済みだが、未入金",
    "例1）契約書の締結は完了したが、資金調達中のため支払いができない",
    "例2）契約書の締結は完了したが、クレジットカードの増枠手続き中",
    "例3）契約書締結済みだが、クレジットカード増枠申請中",
    "### ⚠️注意事項",
    "- 契約書締結が必須",
    "- 契約書締結まで進んでいない場合は保留",
    "- 入金確認後は「予定→成約」へ変更",
    '# 成約予定（ライフティ） {color="red_bg"}',
    "契約書締結済みで、ライフティ審査結果待ちの場合",
    "### ⚠️注意事項",
    "- 契約書締結が必須",
    '# 予定 → 成約 {color="red_bg"}',
    "成約予定だった方の入金が確認できた場合",
    "例1）銀行振込予定だった方が入金完了",
    "例2）クレジットカード増枠完了後に決済完了",
    "例3）ライフティ審査通過後本人確認完了",
    "### ⚠️注意事項",
    "- 入金確認が取れた時点で変更",
    "- 口頭の支払い報告のみでは変更しない",
    '# 保留 {color="green_bg"}',
    "初回zoom内で保留になった場合",
    "例）数日検討、旦那相談、契約締結完了していないなど",
    "### ⚠️注意事項",
    "- 必ず次回アクション日・保留理由を記載",
    '- <span underline="true">**保留のまま放置しないこと**</span><span underline="true">😡</span>',
    '# 保留 → 成約 {color="pink_bg"}',
    "保留だった方が後日契約・入金した場合",
    "### 注意事項",
    "- 入金確認完了後に変更",
    '# 保留 → 失注 {color="gray_bg"}',
    "保留だった方が最終的に入会を辞退した場合",
    "### ⚠️注意事項",
    "- 辞退意思が確認できた時点で変更",
    "- 失注理由の記載を忘れないこと",
    '# 成約予定 → 失注 {color="gray_bg"}',
    "契約書締結後に入金ができなかった場合。",
    "### 例",
    "例1）契約書を結んでいるのに音信不通になった",
    "例2）入金の目処が立たない",
    "### ⚠️注意事項",
    "連絡が途絶えている場合、速やかにステータスを変更すること",
    '# 失注 {color="gray_bg"}',
    "初回zoom内で失注した場合",
    "### ⚠️注意事項",
    "失注理由をしっかり記載すること",
    '# クーリングオフ {color="purple_bg"}',
    "入金完了後、法定期間内（8日以内）にクーリングオフ申請があった場合",
    "### ⚠️注意事項",
    "- 必ず入金済みであること",
    '- <span underline="true">**入金をもらっていない中でお客様からクーリングオフの申し出があった際は『予定→失注』になる。**</span>',
    '# **MLM失注** {color="gray_bg"}',
    "ネットワークビジネスの販売を目的としたインスタ運用をご希望で、お断りした場合",
    "### ⚠️注意事項",
    "証明動画提出必須",
    "<empty-block/>",
  ].join("\n"),
};

const sourceUrls = new Set(chatbotKnowledgeSources.map((source) => source.url));
const extraNotionSources = rawNotionPages
  .filter((page) => page.url && page.markdown?.trim() && !sourceUrls.has(page.url))
  .map((page) => ({
    id: slugifyNotionUrl(page.url),
    category: page.category ?? "Notion",
    title: page.title ?? "Notion page",
    sourceTitle: page.title ?? "Notion page",
    url: page.url,
    provider: "notion" as const,
    tags: [page.category ?? "Notion", page.title ?? "Notion page"],
    content: page.markdown,
    notes: [],
  }));

const articleSources = [...chatbotKnowledgeSources, ...extraNotionSources];
const internalPathBySourceUrl = articleSources.reduce<Record<string, string>>(
  (grouped, source) => {
    const normalized = normalizeNotionUrlForLookup(source.url) ?? source.url;
    grouped[normalized] = `/chatbot-knowledge/${source.id}`;
    return grouped;
  },
  {}
);

const articles: ChatbotInternalArticle[] = articleSources.map((source) => {
  if (source.id === "payment-method" && !notionMarkdownBySourceUrl[source.url]) {
    return paymentMethodArticle;
  }

  const articleMarkdown =
    notionMarkdownBySourceUrl[source.url] ??
    notionMarkdownOverrides[source.id] ??
    source.content;
  const articleBlocks = createArticleBlocksFromMarkdown(
    source.url,
    rewriteInternalNotionLinks(articleMarkdown)
  );

  return {
    slug: source.id,
    title: source.title,
    category: source.category,
    sourceUrl: source.url,
    internalPath: `/chatbot-knowledge/${source.id}`,
    blocks: [
      ...articleBlocks,
      ...(source.notes ?? []).filter(shouldShowArticleNote).map(
        (note): ChatbotInternalArticleBlock => ({
          type: "text",
          markdown: note,
        })
      ),
      ...(articleBlocks.some((block) => block.type === "image")
        ? []
        : (imageBlocksBySourceUrl[source.url] ?? [])),
    ],
  };
});

function createArticleBlocksFromMarkdown(
  sourceUrl: string,
  markdown: string
): ChatbotInternalArticleBlock[] {
  const localImages = [...(imageBlocksBySourceUrl[sourceUrl] ?? [])];
  const blocks: ChatbotInternalArticleBlock[] = [];
  const textLines: string[] = [];

  function flushText() {
    const markdownText = textLines.join("\n").trim();
    if (markdownText) {
      blocks.push({
        type: "text",
        markdown: markdownText,
      });
    }
    textLines.length = 0;
  }

  for (const line of markdown.split("\n")) {
    const imageMatch = line.match(/^\s*!\[[^\]]*\]\(([^)]+)\)\s*$/);
    if (imageMatch) {
      flushText();
      const markdownImageSrc = imageMatch[1].trim();
      if (markdownImageSrc.startsWith("/chatbot-knowledge/assets/")) {
        blocks.push({
          type: "image",
          src: markdownImageSrc,
          alt: "Notion image",
        });
      } else {
        const image = localImages.shift();
        if (image) blocks.push(image);
      }
      continue;
    }

    textLines.push(line);
  }

  flushText();
  return blocks;
}

function rewriteInternalNotionLinks(markdown: string) {
  return markdown.replace(/\]\(([^)]+)\)/g, (match, href: string) => {
    const normalized = normalizeNotionUrlForLookup(href);
    const internalPath = normalized ? internalPathBySourceUrl[normalized] : null;
    return internalPath ? `](${internalPath})` : match;
  });
}

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
