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
    guide: "貯金、NISA、iDeCo、保険積立",
    placeholder:
      "例：貯金 250万円\nNISA 月3万円\niDeCo なし\n保険積立 月1.5万円",
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
    `子供：${optionLabel(childPlanOptions, selection.childPlan)}`,
    "画像への反映：",
    buildLifeStageImageDirection(selection),
    "基本構図は変えず、人物イラスト・家族構成・未来図だけをこの選択状態に自然に合わせる。",
  ].filter(Boolean).join("\n");
}

function buildCrisisImagePrompt(form: FormState, lifeStageSelection: LifeStageSelection) {
  const customerInfo = buildCustomerInfo(form);
  const age = extractAge(form.family);
  const monthlyNisa = extractMonthlyNisa(form.assets);
  const ageInsight = buildAgeInsight(age, monthlyNisa);
  const imageTitle = `${extractCustomerDisplayName(form.family)}の生涯ライフプラン年棒`;
  const timelineStartInstructions = buildTimelineStartInstructions();

  return `以下のお客様情報をもとに、「${imageTitle}」を今すぐ生成してください。

【目的】
お客様が「今のままだと、理想の暮らしに対して将来のお金が足りないかもしれない」と直感的にわかる1枚画像にする。
ただし、何かを売るための雰囲気、特定の商品やサービスへの誘導、押しつけ、断定、人格や家計管理を責める表現は入れない。

【画像の見た目】
・16:9横長のインフォグラフィック
・画像内のメインタイトルは必ず「${imageTitle}」にする
・画像内のメインタイトル以外に、用途名・内部ラベル・作成指示の文言は入れない
・添付イメージの原型構図、余白、色、見出し、表の見せ方は崩さない。指定した項目の削除・差し替え・追加だけを行う
・白背景、紺の見出し、黄色の注意帯、赤は重要な不足額と赤字化ポイントだけに限定する
・赤の面積は多くしすぎない。全体の15〜20%程度まで
・添付イメージのように、上部に大きなタイトル、家族状況、前提条件、教育費、老後不足額、トータル不足額のボックスを並べる
・家族構成に合わせて、上部左側に家族が並んでいるやさしいイラストを入れる
・家族イラストは、入力された家族構成に合わせる。夫婦、子どもの人数、子どもの年齢感が伝わるようにする。写真風ではなく、明るいフラットイラスト
・中央から下は年表テーブルにする
・年表の列は、年、本人年齢、子ども年齢、ライフイベント、収入、支出、差分、気付きポイント
・上記以外の金額列名や注意列名は追加しない
・収入、支出、差分は、お客様情報に書かれた月収、年収、ボーナス、生活費、家賃、住宅ローン、保険、教育方針、老後生活費などを元に計算する
・差分は「収入 - 支出」で計算し、支出が収入を上回る行は赤字で強調する
・収入や支出が読み取れない場合でも、画像内に確認用の文言は出さず、一般的な概算で自然に補完する
・表はイベントごとのイメージで作る。単なる年齢表ではなく、その時期に起きそうな支出・収入変化・家族イベントを入れる
・赤字になる年、教育費ピーク、大学在学中、老後開始は赤や黄色の帯で強調する
・最下部に「このままだと...」から始まる強い結論帯を入れる

【年表の最初に必ず入れる行】
${timelineStartInstructions}

【必ず入れる内容】
・現在の年齢と65歳までの残り年数
・年金想定は夫婦合計月22万円で固定
・ゆとりある老後生活費は月38万円前後で比較
・月38万円 - 年金22万円 = 月16万円不足
・30年間では約5,760万円不足
・老後資金3,000万円、5,000万円を準備する場合の月額目安
・現在のNISA等の積立額との差分
・現在の積立額がある場合でも「準備できている」と見せず、必要額との差分を赤字で見せる
・子ども1人あたり教育費1,000〜2,000万円、2人なら2,000〜4,000万円
・住宅、車、旅行、家族イベントも人生全体では大きな支出になる

【お客様情報】
${customerInfo}

${buildLifeStageBlock(lifeStageSelection)}

【年齢から見た比較】
${ageInsight}

【比較知見】
・老後資金：金融庁の老後2,000万円問題は、毎月約5万円不足する試算が元。物価上昇後は実質3,000〜5,000万円問題として扱う。
・年金：この資料では夫婦の年金見込みを月22万円で固定する。
・ゆとりある老後生活費：月38万円前後を目安にする。
・教育費：子ども1人あたり約1,000〜2,000万円、2人なら約2,000〜4,000万円を目安にする。
・住宅購入：総支払6,000万円規模になることがある。
・車：人生全体では1,500〜2,500万円規模になることがある。
・結婚、出産、新婚旅行などは合計400〜600万円程度のまとまった支出として扱う。

【最後の結論帯】
「このままだと... 教育費・老後・住宅・車・旅行の支出が重なり、理想の未来に対して大きな不足が見える可能性があります」

追加質問や文章での説明はせず、上記条件を満たす画像をそのまま生成してください。`;
}

function buildIdealImagePrompt(form: FormState, lifeStageSelection: LifeStageSelection) {
  const customerInfo = buildCustomerInfo(form, { includeStrengths: true });
  const strengths = form.strengths.trim() || "未入力。未入力の場合は、家族情報、理想、教育方針、老後の内容から自然に強みの素材を推測する。";

  return `以下のお客様情報をもとに、「ライフスタイル訴求・共感設計画像」を今すぐ生成してください。

【目的】
お客様の強み、過去の経験、挫折や悩み、感情が動いた瞬間、家族や子育ての体験をもとに、
「この人の発信は、どんな人に刺さるのか」を一瞬で整理できる1枚画像にする。
最終的に「あなたの経験は、誰かの共感や学びになる。だから発信できる」という確信が持てる見せ方にする。
殴り書きのような短いメモでも、意味をくみ取り、画像内では自然な言葉に整えてください。

【画像の見た目】
・16:9横長のインフォグラフィック
・添付画像の雰囲気を大切にする。白背景、淡いピンク、クリーム、やわらかいベージュ、薄いグレーの線を中心にした、女性向けでやさしい手書き風インフォグラフィック
・前回の構図、人物イラスト、家族イラスト、A/B/Cターゲットの人物カードは崩さない。今回追加するのは最下部の固定メッセージ帯だけにする
・文字情報よりも、人物、家族、理想の未来、こんな人に刺さる相手の視覚化を優先する
・赤は使わない。強調色は濃いピンクと丸いチェックアイコンで表現する
・全体を2カラム構成にする。左側は「行動を変える流れ」、右側は「理想の未来が叶っているシーン」
・カードは角丸で、細い淡いピンクの罫線。上下に矢印を入れて、流れが一目でわかるようにする
・家族構成をもとに、本人と家族のイラストを入れる
・本人はスマホを持ってInstagramで発信を始めている、やさしい女性または本人像のイラストにする
・家族は本人の近くに配置し、「理想の未来を家族で叶える」雰囲気にする
・写真風ではなく、添付画像のような淡い線画、水彩風、やさしい人物イラスト
・お客様が入力した理想の未来を、旅行、家族時間、働き方、教育、老後などの小さなシーンで表現する
・実在するアカウント名、実在する動画タイトル、実在人物の名前は出さない。画像内では「参考アカウントの型」「代表動画の構成」として表現する

【添付画像を参考にした構成】
・左上：見出し「行動を変える！」、小見出し「Instagramで発信をスタート」。スマホを持つ本人、ハートの吹き出し
・左中：見出し「強み・経験の素材」。下に4つの小アイコンを並べる。アイコン名は、お客様の⭐素材から自然に作る
・左下：見出し「こんな人に刺さる！」または「刺さる相手が見えてくる」。A/B/Cの3階層ターゲットをカードで並べる。各カードには必ず人物イラスト、表情、生活シーンの小さな視覚要素を入れ、文字だけのカードにしない
・さらに下：見出し「発信設計に落とし込む」。参考アカウントの型、代表動画の構成、投稿ネタを小さなアイコンで置く
・右上：大きなピンクの帯で「あなたの経験は、誰かの共感や学びになる」
・右側メイン：家族構成に合わせた本人と家族が、理想の未来を楽しんでいる大きめのイラスト。旅行、海辺、子どもの体験、家族時間など、入力内容に合う場面にする
・右下：チェック付きカードを3つ並べる。「同じ状況の人に刺さる」「同じ悩みの人に刺さる」「同じ人生テーマの人に刺さる」のように、A/B/Cの意味が伝わる言葉にする
・最下部：画像の横幅いっぱいに淡いピンクの帯を作り、以下の固定メッセージを大きく読みやすく入れる
  「SnsClubで正しい環境でチャレンジする事で
  あなたの強みが見つかって
  その強みを活かした運用方法をプロの講師から学び、この未来を未来を叶えましょう✨」

【必ず整理して画像内に入れる内容】
1. この人の強み
2. 感情が動いた経験
3. 刺さるターゲットA/B/C
4. 参考アカウントの型
5. 代表動画の構成
6. 投稿ネタ

【A/B/Cターゲット設計】
A：同属性共感
・「私と同じ状況だ」と感じる層
・例：主婦、子育て中のママ、復職を考えている人など
・お客様情報から、最も近い属性を3つ出す

B：構造共感
・属性は違っても、悩みの構造が同じ層
・例：子育て後に復職すると収入が下がる不安 → 育休復帰予定の人、結婚予定の人、出産を考えている人
・お客様の悩みを抽象化して、同じ構造を持つ人を3つ出す

C：本質共感
・人生課題やテーマが同じ層
・例：復職後の収入減 → 定年後の再雇用、転職、独立など「ライフステージ変化による収入減」
・お客様の経験の本質テーマを1つ言語化し、そのテーマに刺さる人を3つ出す

【参考アカウント・代表動画・投稿ネタの出し方】
・実在アカウント名は出さず、参考アカウントの型として出す
・A層向け：同属性の日常共感アカウント型
・B層向け：悩み解決、働き方改善、家計改善、自己変化アカウント型
・C層向け：人生の選択、キャリア、ライフステージ変化を語るアカウント型
・代表動画は「冒頭の刺さる一言 → 過去の経験 → 悩みの言語化 → 気づき → 行動 → 未来」のような構成で3本提案する
・投稿ネタは、A/B/Cそれぞれに3個ずつ出す

【発信設計の変換ルール】
・強みは、単なる長所ではなく「誰かの悩みを理解できる理由」として表現する
・過去の経験は、「誰かに共感されるストーリー」に変換する
・挫折や悩みは、「同じ悩みの人に刺さる入口」に変換する
・家族や子育ての体験は、「生活感のある信頼」に変換する
・感情が動いた瞬間は、「投稿の冒頭で刺さる言葉」に変換する

【⭐素材の扱い】
以下の⭐素材を、画像内の「強み・経験の素材」「A/B/Cターゲット」「投稿ネタ」に変換する。
殴り書き、単語だけ、文章が途中でも、意味を拾ってきれいに整理する。
素材が少ない場合は、お客様情報全体から自然に補完する。

【⭐素材】
${strengths}

【入れたいセリフ】
・あなたの今までの経験が価値に変わる
・今までの経験がすべて伏線として回収される
・あなたの今までの選択がすべて正解に変わります
・あなたの悩みは、同じ悩みを持つ人に届く

【お客様情報】
${customerInfo}

${buildLifeStageBlock(lifeStageSelection)}

【画像内の構成】
上部：〇〇さんのライフスタイル発信設計
左側：強み、経験、感情が動いた瞬間、発信素材
中央：刺さるターゲットA/B/C
右側：参考アカウントの型、代表動画構成、投稿ネタ
下部：淡いピンクの帯で固定メッセージ「SnsClubで正しい環境でチャレンジする事で / あなたの強みが見つかって / その強みを活かした運用方法をプロの講師から学び、この未来を未来を叶えましょう✨」を大きく配置
この下部帯は前回の構図に追加するだけで、人物イラスト、家族イラスト、「こんな人に刺さる！」の人物カード、理想の未来シーンを削らない

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
}: {
  selection: LifeStageSelection;
  onMaritalStatusChange: (value: Exclude<MaritalStatus, "">) => void;
  onMarriageIntentChange: (value: Exclude<MarriageIntent, "">) => void;
  onChildPlanChange: (value: Exclude<ChildPlan, "">) => void;
}) {
  const showMarriageIntent = selection.maritalStatus === "single";
  const showChildPlan = selection.maritalStatus === "married"
    || (selection.maritalStatus === "single" && Boolean(selection.marriageIntent));

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
          <LifeStageOptionGroup
            title="結婚願望"
            options={marriageIntentOptions}
            value={selection.marriageIntent}
            onChange={onMarriageIntentChange}
          />
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
                    <p>結婚願望：{optionLabel(marriageIntentOptions, lifeStageSelection.marriageIntent)}</p>
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
