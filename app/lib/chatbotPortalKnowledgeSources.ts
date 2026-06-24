import type { ChatbotKnowledgeSource } from "./chatbotKnowledgeSources";

type PortalPage = {
  category: string;
  title: string;
  url: string;
};

function slugifyNotionUrl(url: string) {
  const id = url.split("/").filter(Boolean).at(-1) ?? url;
  return `portal-${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32)}`;
}

function createPortalSource(page: PortalPage): ChatbotKnowledgeSource {
  return {
    id: slugifyNotionUrl(page.url),
    category: page.category,
    title: page.title,
    sourceTitle: page.title,
    url: page.url,
    provider: "notion",
    tags: [page.category, page.title],
    content: [
      page.title,
      `${page.category} のNotionページです。`,
      page.url,
    ].join("\n"),
  };
}

const portalPages: PortalPage[] = [
  { category: "営業ガイド", title: "会社概要", url: "https://app.notion.com/p/2a266ab3bdd082a5b271813c89b56850" },
  { category: "営業ガイド", title: "SnsClubについて理解する", url: "https://app.notion.com/p/45e66ab3bdd0829b9b5b0116ac423a2c" },
  { category: "営業ガイド", title: "営業イベント", url: "https://app.notion.com/p/d8966ab3bdd083fbb1be017422ac0f1d" },
  { category: "営業ガイド", title: "必須設定", url: "https://app.notion.com/p/e0e66ab3bdd083b6adcb013e2b36018e" },
  { category: "営業ガイド", title: "ディスコード部屋案内", url: "https://app.notion.com/p/49266ab3bdd0838b86c1816cf0260f56" },
  { category: "営業ガイド", title: "インスタ運用を学ぶ", url: "https://app.notion.com/p/1a466ab3bdd082c7aa5201a544277182" },
  { category: "営業ガイド", title: "個別相談について学ぶ", url: "https://app.notion.com/p/dc166ab3bdd083b48080018783e7f06c" },
  { category: "営業ガイド", title: "不明事項の相談先・相談方法", url: "https://app.notion.com/p/1cb66ab3bdd082448552013d141b6c61" },
  { category: "営業ガイド", title: "勉強会日程・営業枠設定", url: "https://app.notion.com/p/ca966ab3bdd082bc9084013e88d1d58e" },
  { category: "営業ガイド", title: "参照ページ（権限外）", url: "https://app.notion.com/p/2ebf082e36c2806a8b6bda0c468edff1" },
  { category: "速報・必ず確認", title: "インフルエンサーなりすまし事件", url: "https://app.notion.com/p/15966ab3bdd08233a354016ad8c4579e" },
  { category: "速報・必ず確認", title: "6月ローンチ講師", url: "https://docs.google.com/spreadsheets/d/1D-K1wg8tJQWzJ5XC-QoQmyFdZOsKLdoNxAx9Tnw5wng/edit?gid=0#gid=0" },
  { category: "速報・必ず確認", title: "７月ローンチからの値上げ", url: "https://app.notion.com/p/cf066ab3bdd0839096d281b6ee54123e" },
  { category: "速報・必ず確認", title: "【注意】新ステータス追加", url: "https://app.notion.com/p/36c66ab3bdd0823e92e881e107255641" },
  { category: "営業チームについて", title: "【随時更新】営業組織図", url: "https://app.notion.com/p/d2d66ab3bdd0826c93d68147e6241e0e" },
  { category: "営業チームについて", title: "【６月】教育担当🧑‍🏫", url: "https://app.notion.com/p/2e266ab3bdd08240bb8e0111edb74751" },
  { category: "顧客対応", title: "🔰Lステップのアカウント追加", url: "https://app.notion.com/p/0dd66ab3bdd0825c9819810cb1ab367e" },
  { category: "顧客対応", title: "予約キャンセル・予約変更方法", url: "https://app.notion.com/p/99466ab3bdd083d6a943815e9678fdfd" },
  { category: "顧客対応", title: "⚠️面談後作業（必ず）", url: "https://app.notion.com/p/8f266ab3bdd083c4a23b0138972132a7" },
  { category: "顧客対応", title: "⚠️当日トラブル時のフロー（厳守）", url: "https://app.notion.com/p/dc666ab3bdd082d3919901516b417ac7" },
  { category: "顧客対応", title: "お客様に共有する資料_一覧", url: "https://app.notion.com/p/1ae66ab3bdd08262bc8f0159790b0457" },
  { category: "顧客対応", title: "【熱量維持】スタート後ろ倒し", url: "https://app.notion.com/p/fb866ab3bdd08200bec381bc4c700948" },
  { category: "顧客対応", title: "【熱量維持】着金までの熱量維持", url: "https://app.notion.com/p/be066ab3bdd082ac8636014ffccb4fb7" },
  { category: "顧客管理シート※詳細", title: "着座ステータス", url: "https://app.notion.com/p/f5566ab3bdd083e6ae7b81bfbcb5e67e" },
  { category: "顧客管理シート※詳細", title: "着座ステータス コピー", url: "https://app.notion.com/p/78e66ab3bdd083ddb0ec817247976f44" },
  { category: "顧客管理シート※詳細", title: "実施後ステータス", url: "https://app.notion.com/p/35b66ab3bdd0820588ef81647873d98e" },
  { category: "顧客管理シート※詳細", title: "その他ステータス", url: "https://app.notion.com/p/58d66ab3bdd082c8ad6e01a283e00a4b" },
  { category: "顧客管理シート※詳細", title: "注意【必ず見て】", url: "https://app.notion.com/p/42866ab3bdd0838eb3af818668c5de0a" },
  { category: "顧客管理シート※詳細", title: "未着座フロー", url: "https://app.notion.com/p/a2166ab3bdd08218a5eb01136163df29" },
  { category: "顧客管理シート※詳細", title: "よくある質問", url: "https://app.notion.com/p/da266ab3bdd08214a5bb812291b22108" },
  { category: "営業パフォーマンス向上", title: "営業クエスト", url: "https://app.notion.com/p/bad66ab3bdd0836a867601c23af483d9" },
  { category: "営業パフォーマンス向上", title: "営業ロープレ　ペルソナ作成プロンプト", url: "https://app.notion.com/p/3ec66ab3bdd08352beef81b5822607c7" },
  { category: "営業パフォーマンス向上", title: "ChatGPT - 主婦層ロープレ用キャラクター生成AI（顧客役用）", url: "https://chatgpt.com/g/g-690b6e973ab881919cd11242f7722f30-zhu-fu-ceng-rohureyong-kiyarakutasheng-cheng-ai-gu-ke-yi-yong" },
  { category: "営業パフォーマンス向上", title: "失注自己分析 byひかり", url: "https://app.notion.com/p/6f566ab3bdd082a28a9d01a85d2b3940" },
  { category: "決済関連", title: "決済の種類", url: "https://app.notion.com/p/a5366ab3bdd08386886f81efd3993067" },
  { category: "決済関連", title: "契約作業〜入金対応", url: "https://app.notion.com/p/f7766ab3bdd082a1aaf60164ab5e0562" },
  { category: "決済関連", title: "契約&決済よくある質問", url: "https://app.notion.com/p/90766ab3bdd082a0946e0149bb9fb0e6" },
  { category: "決済関連", title: "クーリングオフ対応", url: "https://app.notion.com/p/2fd66ab3bdd0838ea56c8105f56a7f4f" },
  { category: "決済関連", title: "契約書で説明マスト項目", url: "https://app.notion.com/p/d3566ab3bdd08316b4360177fce9cb80" },
  { category: "決済関連", title: "契約書について質問があった場合", url: "https://app.notion.com/p/a5566ab3bdd082e78c25014dcc4b6414" },
  { category: "営業↔CS", title: "必ず確認して📝", url: "https://app.notion.com/p/9bf66ab3bdd0839eaf65810b8ba75959" },
  { category: "営業↔CS", title: "CSによくある質問", url: "https://app.notion.com/p/f8066ab3bdd0820b9bf5012edc7204b2" },
  { category: "営業↔CS", title: "入会後のプログラム", url: "https://app.notion.com/p/d3b66ab3bdd08235bdf081f782f3d25f" },
  { category: "営業↔CS", title: "担当者", url: "https://app.notion.com/p/42c66ab3bdd082d0bd2c81bd41a70f7d" },
  { category: "個別相談マニュアル", title: "【簡単】個別相談マニュアル", url: "https://app.notion.com/p/3fd66ab3bdd082ea87238168b4b5d5c5" },
  { category: "個別相談マニュアル", title: "【地獄訴求】個別相談マニュアル (工事中👷)", url: "https://app.notion.com/p/e0a66ab3bdd0822d8154015753aad18b" },
  { category: "個別相談マニュアル", title: "個別面談マニュアル解説動画", url: "https://app.notion.com/p/c2b66ab3bdd08313b2a481d2aea7488f" },
  { category: "属性別ナレッジ", title: "🌏海外", url: "https://app.notion.com/p/eeb66ab3bdd08305b85601a798a8dce0" },
  { category: "属性別ナレッジ", title: "👮公務員", url: "https://app.notion.com/p/4b466ab3bdd082a88ff181cb5714762c" },
  { category: "属性別ナレッジ", title: "👩主婦層旦那ブロック動画", url: "https://app.notion.com/p/38c66ab3bdd0832491ce81463e1338b2" },
  { category: "属性別ナレッジ", title: "🔮スピリチュアル", url: "https://app.notion.com/p/28b66ab3bdd0837faa4f016a75e4f8fd" },
  { category: "属性別ナレッジ", title: "🖼️イラストレーター（ハンドメイド）", url: "https://app.notion.com/p/f0266ab3bdd082958cc9015728735d67" },
  { category: "属性別ナレッジ", title: "🍖筋トレニキ", url: "https://app.notion.com/p/f5566ab3bdd0837b986501648c703c8f" },
  { category: "属性別ナレッジ", title: "💄ゆなさん流入（独身女子中心）", url: "https://app.notion.com/p/cdd66ab3bdd082f58d7f81e9bfad622f" },
  { category: "アカウントナレッジ", title: "アカウント提案", url: "https://app.notion.com/p/93766ab3bdd083a9b14c01ea6afdc5c4" },
  { category: "アカウントナレッジ", title: "公務員アカウント", url: "https://app.notion.com/p/6c866ab3bdd0825e93b8817ca45a21b9" },
  { category: "アカウントナレッジ", title: "海外アカウント", url: "https://app.notion.com/p/c3666ab3bdd082278774810ffa48bb4e" },
  { category: "その他ナレッジ", title: "⚠️他社比較", url: "https://app.notion.com/p/63666ab3bdd0821480a081debd736942" },
  { category: "その他ナレッジ", title: "期間限定・イベントトーク", url: "https://app.notion.com/p/cb366ab3bdd08246af99017feab77b43" },
  { category: "その他ナレッジ", title: "SnsClub解像度爆上げ講座", url: "https://app.notion.com/p/5e566ab3bdd083b089e481f79305af30" },
  { category: "その他ナレッジ", title: "脱スランプ/スランプにならないために", url: "https://app.notion.com/p/35e66ab3bdd082bbb166012ea66923ab" },
  { category: "その他ナレッジ", title: "セミナー荒らし➡️成約", url: "https://app.notion.com/p/aeb66ab3bdd082f797950110694d3d7d" },
  { category: "その他ナレッジ", title: "金額提示後のアウト返し", url: "https://app.notion.com/p/cd266ab3bdd08223baed81066301d4af" },
  { category: "請求書関連", title: "請求書作成について", url: "https://app.notion.com/p/37966ab3bdd08340aead0112906a2cbb" },
  { category: "請求書関連", title: "報酬一覧", url: "https://app.notion.com/p/35b66ab3bdd08344a6688115b2d6d6ff" },
  { category: "コンプライアンス遵守", title: "コンプラ＿事例解説", url: "https://app.notion.com/p/07766ab3bdd082279b2181c5865dee2d" },
  { category: "コンプライアンス遵守", title: "営業コンプライアンスについて", url: "https://app.notion.com/p/15866ab3bdd08348823301a32416d476" },
  { category: "新人育成", title: "教育担当マニュアル", url: "https://app.notion.com/p/73966ab3bdd082cc829c013d5e7798a7" },
  { category: "新人育成", title: "【原本】オンボーディングロードマップ", url: "https://app.notion.com/p/75966ab3bdd082ce89768197f13ee18c" },
  { category: "新人育成", title: "【原本】個別面談確認シート", url: "https://app.notion.com/p/30b66ab3bdd0821fb82c81b8d464e071" },
  { category: "新人育成", title: "【最終確認】重要チェックリスト", url: "https://app.notion.com/p/2f766ab3bdd083e2a96a01bd78f7dc7f" },
  { category: "新人育成", title: "【複製してね】失注/保留_反省シート", url: "https://app.notion.com/p/14b66ab3bdd0824daffa81bdf1570d23" },
  { category: "新人育成", title: "【複製してね】失注/保留_反省シート (1)", url: "https://app.notion.com/p/52566ab3bdd083fabd9c017d302d335c" },
  { category: "新人育成", title: "【複製してね】失注/保留_反省シート (2)", url: "https://app.notion.com/p/f2b66ab3bdd08312b4728160b823aaf2" },
  { category: "新人育成", title: "【複製してね】失注/保留_反省シート (3)", url: "https://app.notion.com/p/cbd66ab3bdd082cc9df9010843debef5" },
  { category: "新人育成", title: "E-learning", url: "https://app.notion.com/p/36366ab3bdd0827aa8d38177a7faef5a" },
  { category: "FAQ（よくある質問）", title: "営業FAQ", url: "https://app.notion.com/p/8a666ab3bdd083ed960f81e982831a8d" },
  { category: "FAQ（よくある質問）", title: "アーカイブ", url: "https://app.notion.com/p/12666ab3bdd083f18739014dfb12a420" },
  { category: "推進勉強会アーカイブ", title: "【つかさ】14連続成約の秘訣", url: "https://app.notion.com/p/e4d66ab3bdd0839088da01f6a76f3b59" },
  { category: "推進勉強会アーカイブ", title: "【かおる】営業の有名本を分かりやすく解説てみた", url: "https://app.notion.com/p/64f66ab3bdd0839a90438146f37d21a0" },
  { category: "推進勉強会アーカイブ", title: "【しゅり】クロージング強化", url: "https://app.notion.com/p/ee666ab3bdd082d695d9818fdc601a35" },
  { category: "推進勉強会アーカイブ", title: "【つかさ】つかさスタイル解説", url: "https://app.notion.com/p/b4066ab3bdd082708ff381121494e7aa" },
  { category: "推進勉強会アーカイブ", title: "【MG陣】商談録画解説", url: "https://app.notion.com/p/53e66ab3bdd082089dbe019a780f633b" },
  { category: "推進勉強会アーカイブ", title: "ありにゃん成約動画解説", url: "https://app.notion.com/p/01966ab3bdd0831aaa2c010478f4c767" },
  { category: "推進勉強会アーカイブ", title: "なぎ成約動画解説", url: "https://app.notion.com/p/6ac66ab3bdd082dc85e581321194f3a1" },
];

export const chatbotPortalKnowledgeSources = portalPages.map(createPortalSource);
