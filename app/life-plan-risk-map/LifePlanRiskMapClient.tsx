"use client";

import {
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

type FormState = {
  family: string;
  income: string;
  expenses: string;
  assets: string;
  education: string;
  idealsBeforeRetirement: string;
  retirement: string;
  strengths: string;
};

type InputMode = "detailed" | "simple";
type MaritalStatus = "married" | "single" | "";
type MarriageIntent = "wants_marriage" | "no_marriage" | "";
type ChildPlan = "has_children" | "wants_children" | "no_children" | "";

type LifeStageSelection = {
  maritalStatus: MaritalStatus;
  marriageIntent: MarriageIntent;
  childPlan: ChildPlan;
};

type Section = {
  key: keyof FormState;
  number: string;
  title: string;
  guide: string;
  placeholder: string;
};

type OptionButton<T extends string> = {
  value: T;
  label: string;
  description: string;
};

type SingleFutureOption = OptionButton<string> & {
  marriageIntent: Exclude<MarriageIntent, "">;
  childPlan: Exclude<ChildPlan, "">;
};

type SimpleMemoHint = {
  title: string;
  items: string[];
};

const initialForm: FormState = {
  family: "",
  income: "",
  expenses: "",
  assets: "",
  education: "",
  idealsBeforeRetirement: "",
  retirement: "",
  strengths: "",
};

const initialLifeStageSelection: LifeStageSelection = {
  maritalStatus: "",
  marriageIntent: "",
  childPlan: "",
};

const maritalStatusOptions: Array<OptionButton<Exclude<MaritalStatus, "">>> = [
  {
    value: "married",
    label: "既婚",
    description: "夫婦・家族の未来図に寄せる",
  },
  {
    value: "single",
    label: "独身",
    description: "現在は一人の状態から未来を作る",
  },
];

const marriageIntentOptions: Array<OptionButton<Exclude<MarriageIntent, "">>> = [
  {
    value: "wants_marriage",
    label: "結婚願望あり",
    description: "将来の配偶者がいる未来図に寄せる",
  },
  {
    value: "no_marriage",
    label: "結婚願望なし",
    description: "自分軸の将来設計に寄せる",
  },
];

const childPlanOptions: Array<OptionButton<Exclude<ChildPlan, "">>> = [
  {
    value: "has_children",
    label: "子供いる",
    description: "現在の子供がいる前提で描く",
  },
  {
    value: "wants_children",
    label: "将来子供希望",
    description: "未来図に子供がいる場面を入れる",
  },
  {
    value: "no_children",
    label: "子供希望なし",
    description: "子供なしの暮らしを自然に描く",
  },
];

const singleFutureOptions: SingleFutureOption[] = [
  {
    value: "wants_marriage_no_children",
    label: "結婚願望あり子供不要",
    description: "将来は夫婦二人の未来図に寄せる",
    marriageIntent: "wants_marriage",
    childPlan: "no_children",
  },
  {
    value: "wants_marriage_wants_children",
    label: "結婚子供希望あり",
    description: "将来は結婚して子供がいる未来図に寄せる",
    marriageIntent: "wants_marriage",
    childPlan: "wants_children",
  },
];

const sections: Section[] = [
  {
    key: "family",
    number: "1",
    title: "家族情報",
    guide: "お名前、年齢、配偶者年齢、お子さん年齢（全員）",
    placeholder:
      "例：田中さん\n本人：32歳\n配偶者：34歳\n子ども：6歳、4歳\n子どもはまだいないが、2年後くらいに考えている",
  },
  {
    key: "income",
    number: "2",
    title: "収入",
    guide: "本人月収、配偶者月収、ボーナス",
    placeholder:
      "例：本人月収 35万円\n配偶者月収 12万円\nボーナス 年間80万円\n副業収入は今のところなし",
  },
  {
    key: "expenses",
    number: "3",
    title: "支出",
    guide: "毎月の生活費、家賃or住宅ローン、車ローン、保険、通信費など",
    placeholder:
      "例：生活費 28万円\n住宅ローン 9万円\n車ローン 3万円\n保険 2万円\n通信費 1.5万円\n車1台、7年に1回くらい買い替え予定\n賃貸の場合：2年後くらいに引っ越したい",
  },
  {
    key: "assets",
    number: "4",
    title: "資産",
    guide: "貯金、月々の貯金額、NISA、iDeCo、保険積立",
    placeholder:
      "例：貯金 250万円\n月々の貯金額 8万円\nNISA 月3万円\niDeCo なし\n保険積立 月1.5万円",
  },
  {
    key: "education",
    number: "5",
    title: "教育方針",
    guide: "公立希望、私立OK、習い事、留学など",
    placeholder:
      "例：基本は公立希望\n本人が行きたいなら私立もOK\n習い事は好きなことをやらせたい\n短期留学や海外経験もできればさせたい",
  },
  {
    key: "idealsBeforeRetirement",
    number: "6",
    title: "老後までにしていきたいこと（理想）",
    guide: "旅行、家族時間、趣味、働き方、叶えたい暮らし",
    placeholder:
      "例：年1回は家族旅行に行きたい\n子どもが大きくなったら海外旅行もしたい\n仕事だけでなく家族との時間も大事にしたい\n50代からは少し働き方をゆるめたい",
  },
  {
    key: "retirement",
    number: "7",
    title: "老後",
    guide: "旅行したい、年金だけで暮らしたい、月いくらで生活したい",
    placeholder:
      "例：夫婦で旅行しながら暮らしたい\n年金だけで足りるのか気になる\n理想の生活費は月35万円くらい\n子どもや孫にも使えるお金を残したい",
  },
  {
    key: "strengths",
    number: "8",
    title: "⭐",
    guide: "経験、好きなこと、得意なこと、褒められたこと、悩んできたこと、挑戦したいこと",
    placeholder:
      "例：\n・昔から人の相談に乗ることが多い\n・子育てで悩んだ経験がある\n・美容、健康、暮らしの工夫が好き\n・コツコツ続けるのは得意\n・自分に自信がない人の気持ちがわかる\n・Instagramは初心者だけど変わりたい",
  },
];

const simpleMemoHints: SimpleMemoHint[] = [
  {
    title: "家族情報",
    items: ["お名前", "本人年齢", "配偶者年齢", "子どもの人数・年齢", "今後の出産予定"],
  },
  {
    title: "収入情報",
    items: ["本人月収・年収", "配偶者収入", "ボーナス", "副業", "今後の働き方"],
  },
  {
    title: "支出情報",
    items: ["生活費", "家賃・住宅ローン", "車", "保険", "通信費", "固定費"],
  },
  {
    title: "資産情報",
    items: ["貯金", "NISA", "iDeCo", "保険積立", "毎月の積立額"],
  },
  {
    title: "教育・子ども",
    items: ["公立・私立", "習い事", "留学", "進学イメージ", "教育費の不安"],
  },
  {
    title: "理想・老後",
    items: ["旅行", "家族時間", "趣味", "理想の生活費", "老後の不安"],
  },
  {
    title: "あなたの強み",
    items: ["経験", "好きなこと", "得意なこと", "褒められたこと", "悩んできたこと"],
  },
];

const simpleMemoPlaceholder = [
  "例：田中さん、本人32歳、奥さん34歳。子どもは6歳と4歳。",
  "本人月収35万円、奥さん月収12万円、ボーナス年間80万円。",
  "生活費28万円、住宅ローン9万円、車ローン3万円、保険2万円。",
  "貯金250万円、NISA月3万円。子どもは基本公立希望だけど、本人が希望すれば私立も考える。",
  "家族旅行は年1回行きたい。老後は夫婦で旅行しながら月35万円くらいで暮らしたい。",
  "昔から人の相談に乗ることが多く、子育ての悩みも経験している。美容や暮らしの工夫が好き。",
].join("\n");

function toNumber(value: string) {
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractAge(text: string) {
  const ageMatch = text.match(/(?:本人|年齢|ご本人|本人：|本人:)?\s*(\d{2})\s*歳/);
  return ageMatch ? Number(ageMatch[1]) : 0;
}

function extractMonthlyNisa(text: string) {
  const nisaLine = text
    .split(/\n/)
    .find((line) => /nisa|NISA|ニーサ/i.test(line));
  return nisaLine ? toNumber(nisaLine) : 0;
}

function formatCustomerName(rawName: string) {
  const name = rawName
    .replace(/^(お客様名|お客様のお名前|お名前|名前|氏名)\s*[:：]\s*/, "")
    .replace(/\s*(本人|ご本人|年齢|配偶者|パートナー|子ども|こども|月収|年収).*$/, "")
    .replace(/\d{1,3}\s*(歳|才).*$/, "")
    .replace(/[、,。].*$/, "")
    .trim();

  if (!name) return "";
  if (name.endsWith("さん") || name.endsWith("様")) return name;
  return `${name}さん`;
}

function extractCustomerDisplayName(text: string) {
  const explicitName = text.match(/(?:お客様名|お客様のお名前|お名前|名前|氏名)\s*[:：]\s*([^\n、,。]+)/);
  const explicitDisplayName = explicitName ? formatCustomerName(explicitName[1]) : "";

  if (explicitDisplayName) return explicitDisplayName;

  const nameLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !/(配偶者|パートナー|子ども|こども|月収|年収|NISA|貯金|資産)/.test(line));

  if (!nameLine) return "お客様";

  return formatCustomerName(nameLine) || "お客様";
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatYearMonth(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function buildTimelineStartInstructions() {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const anchors = [
    ["3ヶ月後", 3],
    ["半年後", 6],
    ["1年後", 12],
    ["3年後", 36],
    ["5年後", 60],
  ] as const;

  return [
    `現在は${formatYearMonth(currentMonth)}として扱う。`,
    "年表の最初は、必ず以下の順番で行を作る。",
    ...anchors.map(([label, months]) => `・${formatYearMonth(addMonths(currentMonth, months))}（${label}）`),
    "その後は、結婚、出産、住宅、教育、車、旅行、老後など、入力内容から自然なイベント順で続ける。",
  ].join("\n");
}

function buildAgeInsight(age: number, currentMonthlyInvestment: number) {
  if (!age) {
    return [
      "年齢が読み取れない場合は、年齢を確認して65歳までの残り年数を計算する。",
      "年金は夫婦合計月22万円で固定し、理想の老後生活費との差額を出す。",
    ].join("\n");
  }

  const yearsTo65 = Math.max(1, 65 - age);
  const monthlyFor3000 = 3000 / yearsTo65 / 12;
  const monthlyFor5000 = 5000 / yearsTo65 / 12;
  const gap3000 = Math.max(0, monthlyFor3000 - currentMonthlyInvestment);
  const gap5000 = Math.max(0, monthlyFor5000 - currentMonthlyInvestment);

  return [
    `現在${age}歳。65歳まで残り${yearsTo65}年。`,
    `老後資金3,000万円を65歳までに準備するには、単純計算で月${monthlyFor3000.toFixed(1)}万円が目安。`,
    `老後資金5,000万円を65歳までに準備するには、単純計算で月${monthlyFor5000.toFixed(1)}万円が目安。`,
    currentMonthlyInvestment
      ? `現在読み取れるNISA等の積立は月${currentMonthlyInvestment.toFixed(1)}万円。3,000万円目安との差分は月${gap3000.toFixed(1)}万円、5,000万円目安との差分は月${gap5000.toFixed(1)}万円。`
      : "現在の積立額が読み取れない場合は、毎月の資産形成額を確認して差分を出す。",
  ].join("\n");
}

function buildCustomerInfo(form: FormState, options?: { includeStrengths?: boolean }) {
  return sections
    .filter((section) => options?.includeStrengths || section.key !== "strengths")
    .map((section) => {
      const value = form[section.key].trim() || "未入力";
      return `【${section.number}. ${section.title}】\n${value}`;
    })
    .join("\n\n");
}

function optionLabel<T extends string>(options: Array<OptionButton<T>>, value: T | "") {
  return options.find((option) => option.value === value)?.label || "未選択";
}

function singleFutureLabel(selection: LifeStageSelection) {
  if (selection.maritalStatus !== "single") return "";

  return singleFutureOptions.find((option) => (
    option.marriageIntent === selection.marriageIntent
    && option.childPlan === selection.childPlan
  ))?.label || "";
}

function buildLifeStageImageDirection(selection: LifeStageSelection) {
  const { maritalStatus, marriageIntent, childPlan } = selection;

  if (!maritalStatus) {
    return "現状が未選択の場合は、お客様情報に書かれた家族構成を優先して自然に描く。";
  }

  if (maritalStatus === "married") {
    if (childPlan === "has_children") {
      return "現在は既婚で子供がいるため、夫婦と子供がいる現在の家族像と、その家族で叶える未来図を自然に描く。";
    }

    if (childPlan === "wants_children") {
      return "現在は既婚で、将来子供を希望しているため、今は夫婦中心、未来図では子供もいる家族像を自然に描く。";
    }

    if (childPlan === "no_children") {
      return "現在は既婚で、子供は希望しないため、夫婦二人の暮らし、旅行、働き方、老後の未来図を自然に描く。";
    }

    return "現在は既婚のため、夫婦を中心にした未来図を自然に描く。";
  }

  if (marriageIntent === "wants_marriage") {
    if (childPlan === "has_children") {
      return "現在は独身だが子供がいるため、今の親子の暮らしを起点に、将来結婚も視野に入れた家族の未来図を自然に描く。";
    }

    if (childPlan === "wants_children") {
      return "今は独身だが将来結婚して子供が欲しいため、現在は一人の姿、未来図では配偶者と子供がいる家族像を自然に描く。";
    }

    if (childPlan === "no_children") {
      return "今は独身だが将来結婚したい、子供は希望しないため、未来図では夫婦二人の暮らしを自然に描く。";
    }

    return "今は独身だが将来結婚したい状態として、現在の一人の姿から、将来の配偶者がいる未来図へ自然につなげる。";
  }

  if (marriageIntent === "no_marriage") {
    if (childPlan === "has_children") {
      return "現在は独身で子供がいるため、本人と子供の暮らしを中心に、安心できる未来図を自然に描く。";
    }

    if (childPlan === "wants_children") {
      return "現在は独身で結婚願望はないが将来子供を希望しているため、自分らしい暮らしと子供がいる未来図を自然に描く。";
    }

    if (childPlan === "no_children") {
      return "現在は独身で結婚願望も子供希望もないため、自分軸の暮らし、仕事、趣味、老後の未来図を自然に描く。";
    }

    return "現在は独身で結婚願望はないため、自分軸の将来設計として自然に描く。";
  }

  return "現在は独身のため、今の一人の暮らしを起点に、選択された将来像へ自然につなげる。";
}

function buildLifeStageBlock(selection: LifeStageSelection) {
  return [
    "【ライフステージ選択】",
    `現状：${optionLabel(maritalStatusOptions, selection.maritalStatus)}`,
    selection.maritalStatus === "single"
      ? `結婚願望：${optionLabel(marriageIntentOptions, selection.marriageIntent)}`
      : "",
    singleFutureLabel(selection) ? `独身の未来パターン：${singleFutureLabel(selection)}` : "",
    `子供：${optionLabel(childPlanOptions, selection.childPlan)}`,
    "画像への反映：",
    buildLifeStageImageDirection(selection),
    "基本構図は変えず、人物イラスト・家族構成・未来図だけをこの選択状態に自然に合わせる。",
  ].filter(Boolean).join("\n");
}

function buildIncomeCalculationRules() {
  return [
    "【収入計算ルール】",
    "・収入未入力の場合は、本人年齢に近い国税庁の年齢階層別平均給与を初期値にする。",
    "・年表の収入は国税庁の年齢階層別平均給与カーブに沿わせる。入力年収がある場合は、現在年齢の平均給与に対する倍率を保ったまま将来年齢へ反映する。",
    "・月々の貯金額がある場合は、現在支出を「現在年収 - 月々の貯金額×12」で逆算する。",
    "・副業を始めない／副業収入を増やさない世界線で計算する。",
    "・収入は現在確定している本人収入、配偶者収入、ボーナス、安定済み副業収入のみ。",
    "・副業目標、稼ぎたい額、希望収入など未確定のプラス見込みは収入・差分に入れない。",
    "・未確定の副業額は参考情報のみ。副業なしの収支差分を出す。",
  ].join("\n");
}

function buildCrisisImagePrompt(form: FormState, lifeStageSelection: LifeStageSelection) {
  const customerInfo = buildCustomerInfo(form);
  const age = extractAge(form.family);
  const monthlyNisa = extractMonthlyNisa(form.assets);
  const ageInsight = buildAgeInsight(age, monthlyNisa);
  const imageTitle = `${extractCustomerDisplayName(form.family)}の生涯ライフプラン年棒`;
  const timelineStartInstructions = buildTimelineStartInstructions();

  return `「${imageTitle}」の16:9横長インフォグラフィックを生成してください。

【狙い】
今の生活のまま進んだ場合に、教育費・老後・住宅・車・旅行などで将来不足が出る可能性を、責めずに見える化する。

【構図】
・タイトルは「${imageTitle}」
・添付イメージの構図、白背景、紺見出し、黄色注意帯、赤字強調を維持
・上部：家族イラスト、家族状況、前提、教育費、老後不足、大きな支出テーマのボックス
・中央〜下部：年表テーブル
・表の列：年／本人年齢／子ども年齢／ライフイベント／収入／支出／差分／気付きポイント
・赤字になる行、教育費ピーク、老後開始は赤または黄色で強調
・「合計不足金額」のボックスや項目は作らない
・画像内に「要確認」や作成指示、内部ラベルは出さない

【年表の最初に入れる行】
${timelineStartInstructions}

【計算前提】
・差分は「収入 - 支出」
・収入未入力の場合は、本人年齢に近い国税庁の年齢階層別平均給与を入れる
・年表の収入は国税庁の年齢階層別平均給与カーブに沿わせる。現在年収が入力されている場合は、現在年齢の平均給与に対する倍率を保ったまま将来年齢へ反映する
・月々の貯金額がある場合は、現在支出を「現在年収 - 月々の貯金額×12」で逆算する
・住宅を後々購入する場合、購入額を35年ローンで割った年額へ、その年から住居費を切り替える
・年金は夫婦合計月22万円、ゆとりある老後生活費は月38万円
・老後不足は月16万円、30年で約5,760万円
・教育費は子ども1人1,000〜2,000万円目安
・住宅、車、旅行、家族イベントも大きな支出として入れる
・数値が不足する場合は一般的な概算で自然に補完し、画像内に確認文は出さない

【お客様情報】
${customerInfo}

${buildLifeStageBlock(lifeStageSelection)}

${buildIncomeCalculationRules()}

【年齢から見た比較】
${ageInsight}

【最後の結論帯】
「このままだと... 教育費・老後・住宅・車・旅行の支出が重なり、理想の未来に対して大きな不足が見える可能性があります」

追加説明は不要です。画像だけ生成してください。`;
}

function buildIdealImagePrompt(form: FormState, lifeStageSelection: LifeStageSelection) {
  const customerInfo = buildCustomerInfo(form, { includeStrengths: true });
  const strengths = form.strengths.trim() || "未入力。未入力の場合は、家族情報、理想、教育方針、老後の内容から自然に強みの素材を推測する。";

  return `以下のお客様情報をもとに、「あなたの強み」を見える化する16:9横長インフォグラフィックを生成してください。

【狙い】
お客様の経験、悩み、感情が動いた瞬間、家族や子育ての体験から、どんな人に刺さる発信ができるかを1枚で整理する。

【見た目】
・白背景、淡いピンク、クリーム、薄いグレー線のやさしい手書き風
・前回の構図、人物イラスト、家族イラスト、A/B/C人物カードを維持
・文字より人物、家族、理想の未来、刺さる相手の視覚化を優先
・赤は使わない。濃いピンクとチェックアイコンで強調
・左：行動を変える流れ／中央：刺さるターゲットA/B/C／右：理想の未来
・人物カードは必ず人物イラスト、表情、生活シーンを入れ、文字だけにしない
・実在アカウント名、実在人物名、実在動画名は出さない

【入れる内容】
・この人の強み
・感情が動いた経験
・刺さるターゲットA/B/C
・参考アカウントの型
・代表動画の構成
・投稿ネタ

【A/B/Cの考え方】
・A：同じ状況の人に刺さる
・B：同じ悩みの構造を持つ人に刺さる
・C：同じ人生テーマの人に刺さる

【最下部の固定帯】
淡いピンクの横長帯に、以下を3行で大きく入れる。
SnsClubで正しい環境でチャレンジする事で
あなたの強みが見つかって
その強みを活かした運用方法をプロの講師から学び、この未来を未来を叶えましょう✨

【素材の扱い】
殴り書きや短い単語でも意味をくみ取り、自然な言葉に整える。
素材が少ない場合は、お客様情報全体から自然に補完する。

【⭐素材】
${strengths}

【お客様情報】
${customerInfo}

${buildLifeStageBlock(lifeStageSelection)}

【画像内の構成】
上部：〇〇さんのライフスタイル発信設計
左側：強み、経験、発信素材
中央：こんな人に刺さる！ A/B/C人物カード
右側：理想の未来、参考アカウントの型、代表動画構成、投稿ネタ
下部：固定メッセージ帯。人物イラストやA/B/C人物カードを削らない

追加質問や文章での説明はせず、上記条件を満たす画像をそのまま生成してください。`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 py-3 text-base font-black text-white hover:bg-stone-800"
    >
      <Clipboard className="h-5 w-5" />
      {copied ? "コピーしました" : label}
    </button>
  );
}

function LifeStageOptionGroup<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<OptionButton<T>>;
  value: T | "";
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-xs font-black text-stone-500">{title}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={[
                "min-h-16 rounded-md border px-3 py-3 text-left transition",
                isSelected
                  ? "border-stone-950 bg-stone-950 text-white shadow-sm"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-400",
              ].join(" ")}
            >
              <span className="block text-sm font-black">{option.label}</span>
              <span
                className={[
                  "mt-1 block text-xs font-bold leading-5",
                  isSelected ? "text-stone-200" : "text-stone-400",
                ].join(" ")}
              >
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LifeStageSelector({
  selection,
  onMaritalStatusChange,
  onMarriageIntentChange,
  onChildPlanChange,
  onSingleFutureChange,
}: {
  selection: LifeStageSelection;
  onMaritalStatusChange: (value: Exclude<MaritalStatus, "">) => void;
  onMarriageIntentChange: (value: Exclude<MarriageIntent, "">) => void;
  onChildPlanChange: (value: Exclude<ChildPlan, "">) => void;
  onSingleFutureChange: (option: SingleFutureOption) => void;
}) {
  const showMarriageIntent = selection.maritalStatus === "single";
  const showChildPlan = selection.maritalStatus === "married"
    || (selection.maritalStatus === "single" && Boolean(selection.marriageIntent));
  const selectedSingleFutureLabel = singleFutureLabel(selection);

  return (
    <section className="border-t border-stone-200 bg-white px-5 py-5 sm:px-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-stone-500">現状</p>
          <h2 className="mt-1 text-lg font-black text-stone-950">
            家族構成の前提を選択
          </h2>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <LifeStageOptionGroup
          title="現状"
          options={maritalStatusOptions}
          value={selection.maritalStatus}
          onChange={onMaritalStatusChange}
        />

        {showMarriageIntent && (
          <>
            <div>
              <p className="text-xs font-black text-stone-500">独身の未来パターン</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {singleFutureOptions.map((option) => {
                  const isSelected = selectedSingleFutureLabel === option.label;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSingleFutureChange(option)}
                      className={[
                        "min-h-16 rounded-md border px-3 py-3 text-left transition",
                        isSelected
                          ? "border-stone-950 bg-stone-950 text-white shadow-sm"
                          : "border-stone-200 bg-white text-stone-700 hover:border-stone-400",
                      ].join(" ")}
                    >
                      <span className="block text-sm font-black">{option.label}</span>
                      <span
                        className={[
                          "mt-1 block text-xs font-bold leading-5",
                          isSelected ? "text-stone-200" : "text-stone-400",
                        ].join(" ")}
                      >
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <LifeStageOptionGroup
              title="結婚願望"
              options={marriageIntentOptions}
              value={selection.marriageIntent}
              onChange={onMarriageIntentChange}
            />
          </>
        )}

        {showChildPlan && (
          <LifeStageOptionGroup
            title="子供"
            options={childPlanOptions}
            value={selection.childPlan}
            onChange={onChildPlanChange}
          />
        )}
      </div>
    </section>
  );
}

function SimpleMemoPanel({
  memo,
  onMemoChange,
  onOrganize,
  isOrganizing,
  organizeError,
  organizeNotice,
}: {
  memo: string;
  onMemoChange: (value: string) => void;
  onOrganize: () => void;
  isOrganizing: boolean;
  organizeError: string;
  organizeNotice: string;
}) {
  return (
    <section className="bg-white px-5 py-6 shadow-sm sm:px-7">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-950 text-white">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-stone-950">簡単フォーマット</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            営業側のメモ用です。聞いた順番がバラバラでも、そのまま入れて整理できます。
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs font-black tracking-normal text-stone-500">聞いておきたい項目</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {simpleMemoHints.map((hint) => (
            <div key={hint.title} className="rounded-md border border-stone-200 bg-white p-3">
              <p className="text-sm font-black text-stone-800">{hint.title}</p>
              <p className="mt-2 text-xs leading-5 text-stone-400">
                {hint.items.join(" / ")}
              </p>
            </div>
          ))}
        </div>
      </div>

      <textarea
        className="mt-4 min-h-[460px] w-full resize-y rounded-md border border-stone-300 bg-white px-4 py-3 text-base leading-7 outline-none focus:border-stone-950"
        value={memo}
        onChange={(event) => onMemoChange(event.target.value)}
        placeholder={simpleMemoPlaceholder}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOrganize}
          disabled={isOrganizing}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-950 px-5 py-3 text-sm font-black text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {isOrganizing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          AIで整理して反映
        </button>
        {organizeNotice && (
          <span className="text-sm font-bold text-emerald-700">{organizeNotice}</span>
        )}
      </div>

      {organizeError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800">
          {organizeError}
        </div>
      )}
    </section>
  );
}

export function LifePlanRiskMapClient() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [inputMode, setInputMode] = useState<InputMode>("detailed");
  const [lifeStageSelection, setLifeStageSelection] = useState<LifeStageSelection>(initialLifeStageSelection);
  const [simpleMemo, setSimpleMemo] = useState("");
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeError, setOrganizeError] = useState("");
  const [organizeNotice, setOrganizeNotice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generatedImage, setGeneratedImage] = useState<{
    dataUrl: string;
    kind: "crisis" | "ideal";
    model?: string;
    size?: string;
  } | null>(null);
  const filledCount = sections.filter((section) => form[section.key].trim()).length;
  const progress = Math.round((filledCount / sections.length) * 100);
  const crisisPrompt = useMemo(
    () => buildCrisisImagePrompt(form, lifeStageSelection),
    [form, lifeStageSelection],
  );
  const idealPrompt = useMemo(
    () => buildIdealImagePrompt(form, lifeStageSelection),
    [form, lifeStageSelection],
  );

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateMaritalStatus = (maritalStatus: Exclude<MaritalStatus, "">) => {
    setLifeStageSelection((current) => ({
      maritalStatus,
      marriageIntent: maritalStatus === "single" ? current.marriageIntent : "",
      childPlan: maritalStatus === current.maritalStatus ? current.childPlan : "",
    }));
  };

  const updateMarriageIntent = (marriageIntent: Exclude<MarriageIntent, "">) => {
    setLifeStageSelection((current) => ({
      ...current,
      marriageIntent,
      childPlan: current.marriageIntent === marriageIntent ? current.childPlan : "",
    }));
  };

  const updateChildPlan = (childPlan: Exclude<ChildPlan, "">) => {
    setLifeStageSelection((current) => ({ ...current, childPlan }));
  };

  const updateSingleFuture = (option: SingleFutureOption) => {
    setLifeStageSelection((current) => ({
      ...current,
      maritalStatus: "single",
      marriageIntent: option.marriageIntent,
      childPlan: option.childPlan,
    }));
  };

  const reset = () => {
    setForm(initialForm);
    setLifeStageSelection(initialLifeStageSelection);
    setSimpleMemo("");
    setOrganizeError("");
    setOrganizeNotice("");
    setGenerationError("");
    setGeneratedImage(null);
  };

  const organizeSimpleMemo = async () => {
    if (!simpleMemo.trim()) {
      setOrganizeError("メモを入力してから整理してください。");
      setOrganizeNotice("");
      return;
    }

    setIsOrganizing(true);
    setOrganizeError("");
    setOrganizeNotice("");

    try {
      const response = await fetch("/api/life-plan-risk-map/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo: simpleMemo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "メモの整理に失敗しました。");
      }

      setForm((current) => ({
        ...current,
        ...data.form,
      }));
      setOrganizeNotice("整理して詳細パターンへ反映しました。");
      setGeneratedImage(null);
    } catch (error) {
      setOrganizeError(error instanceof Error ? error.message : "メモの整理に失敗しました。");
    } finally {
      setIsOrganizing(false);
    }
  };

  const generateImage = async (kind: "crisis" | "ideal") => {
    const prompt = kind === "crisis" ? crisisPrompt : idealPrompt;
    setIsGenerating(true);
    setGenerationError("");

    try {
      const response = await fetch("/api/life-plan-risk-map/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, prompt, form }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "画像生成に失敗しました。");
      }

      setGeneratedImage({
        dataUrl: data.imageDataUrl,
        kind,
        model: data.model,
        size: data.size,
      });
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "画像生成に失敗しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto flex max-w-6xl flex-col lg:flex-row">
        <div className="w-full lg:w-[58%]">
          <div className="sticky top-0 z-10 border-b border-stone-300 bg-white px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-stone-500">Life Plan Sheet</p>
                <h1 className="text-2xl font-black tracking-normal text-stone-950">
                  ライフプラン整理フォーム
                </h1>
              </div>
              <div className="min-w-32">
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-stone-600">
                  <span>入力</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full bg-stone-950 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-md bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => setInputMode("detailed")}
                className={[
                  "min-h-11 rounded-md px-4 py-2 text-sm font-black transition",
                  inputMode === "detailed"
                    ? "bg-stone-950 text-white shadow-sm"
                    : "bg-transparent text-stone-600 hover:bg-white",
                ].join(" ")}
              >
                詳細パターン
              </button>
              <button
                type="button"
                onClick={() => setInputMode("simple")}
                className={[
                  "min-h-11 rounded-md px-4 py-2 text-sm font-black transition",
                  inputMode === "simple"
                    ? "bg-stone-950 text-white shadow-sm"
                    : "bg-transparent text-stone-600 hover:bg-white",
                ].join(" ")}
              >
                簡単フォーマット
              </button>
            </div>
          </div>

          <LifeStageSelector
            selection={lifeStageSelection}
            onMaritalStatusChange={updateMaritalStatus}
            onMarriageIntentChange={updateMarriageIntent}
            onChildPlanChange={updateChildPlan}
            onSingleFutureChange={updateSingleFuture}
          />

          {inputMode === "detailed" ? (
            <form className="divide-y divide-stone-200">
              {sections.map((section) => (
                <section key={section.key} className="bg-white px-5 py-6 shadow-sm sm:px-7">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-950 text-sm font-black text-white">
                      {section.number}
                    </span>
                    <div>
                      <h2 className="text-lg font-black text-stone-950">{section.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-stone-500">{section.guide}</p>
                    </div>
                  </div>
                  <textarea
                    className="mt-4 min-h-40 w-full resize-y rounded-md border border-stone-300 bg-white px-4 py-3 text-base leading-7 outline-none focus:border-stone-950"
                    value={form[section.key]}
                    onChange={(event) => updateForm(section.key, event.target.value)}
                    placeholder={section.placeholder}
                  />
                </section>
              ))}
            </form>
          ) : (
            <SimpleMemoPanel
              memo={simpleMemo}
              onMemoChange={setSimpleMemo}
              onOrganize={organizeSimpleMemo}
              isOrganizing={isOrganizing}
              organizeError={organizeError}
              organizeNotice={organizeNotice}
            />
          )}
        </div>

        <aside className="w-full border-l border-stone-200 bg-stone-50 lg:sticky lg:top-0 lg:h-screen lg:w-[42%] lg:overflow-y-auto">
          <div className="px-5 py-5 sm:px-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-stone-500">作成準備</p>
                <h2 className="mt-1 text-xl font-black text-stone-950">
                  入力が終わったらコピー
                </h2>
              </div>
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                title="リセット"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-md border border-stone-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-base font-black text-stone-950">
                    ここには入力内容だけが見えます
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    コピー用の文章は画面に表示しません。入力内容をもとに、裏側で画像作成用の文章を準備します。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-md border border-stone-200 bg-white p-4">
                <p className="text-xs font-bold text-stone-500">ライフステージ選択</p>
                <div className="mt-2 grid gap-1 text-sm font-bold leading-6 text-stone-700">
                  <p>現状：{optionLabel(maritalStatusOptions, lifeStageSelection.maritalStatus)}</p>
                  {lifeStageSelection.maritalStatus === "single" && (
                    <>
                      {singleFutureLabel(lifeStageSelection) && (
                        <p>独身の未来パターン：{singleFutureLabel(lifeStageSelection)}</p>
                      )}
                      <p>結婚願望：{optionLabel(marriageIntentOptions, lifeStageSelection.marriageIntent)}</p>
                    </>
                  )}
                  <p>子供：{optionLabel(childPlanOptions, lifeStageSelection.childPlan)}</p>
                </div>
              </div>
              <div className="rounded-md border border-stone-200 bg-white p-4">
                <p className="text-xs font-bold text-stone-500">入力済み</p>
                <p className="mt-1 text-3xl font-black text-stone-950">
                  {filledCount} / {sections.length}
                </p>
              </div>
              <div className="rounded-md border border-stone-200 bg-white p-4">
                <p className="text-xs font-bold text-stone-500">次にやること</p>
                <p className="mt-2 text-sm font-bold leading-6 text-stone-700">
                  {inputMode === "simple"
                    ? "メモをAIで整理したら、下のボタンから用途別にコピーできます。必要なら詳細パターンで微調整できます。"
                    : "全体を確認したら、用途に合わせて下のボタンを押し、ChatGPTの画像生成に貼り付けます。"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <CopyButton text={crisisPrompt} label="将来設計年棒プロンプト" />
              <CopyButton text={idealPrompt} label="あなたの強み" />
            </div>
            <div className="mt-4 rounded-md border border-stone-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-stone-800" />
                <div>
                  <p className="text-base font-black text-stone-950">WEB上で画像生成</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    入力内容から作ったプロンプトをそのままOpenAI画像生成に送ります。テスト中は1回ずつ生成してください。
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => generateImage("crisis")}
                  disabled={isGenerating}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-3 text-sm font-black text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  将来設計年棒プロンプト
                </button>
                <button
                  type="button"
                  onClick={() => generateImage("ideal")}
                  disabled={isGenerating}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  あなたの強み
                </button>
              </div>

              {generationError && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800">
                  {generationError}
                </div>
              )}

              {generatedImage && (
                <div className="mt-4 overflow-hidden rounded-md border border-stone-200 bg-stone-50">
                  <img
                    src={generatedImage.dataUrl}
                    alt={generatedImage.kind === "crisis" ? "生成された将来設計年棒プロンプト" : "生成された理想画像"}
                    className="aspect-video w-full bg-stone-200 object-contain"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <p className="text-xs font-bold text-stone-500">
                      {generatedImage.kind === "crisis" ? "将来設計年棒プロンプト" : "理想画像"}
                      {generatedImage.model ? ` / ${generatedImage.model}` : ""}
                      {generatedImage.size ? ` / ${generatedImage.size}` : ""}
                    </p>
                    <a
                      href={generatedImage.dataUrl}
                      download={`life-plan-${generatedImage.kind}.png`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-black text-white hover:bg-stone-800"
                    >
                      <Download className="h-4 w-4" />
                      ダウンロード
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
