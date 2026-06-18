"use client";

import { CheckCircle2, Clipboard, Download, Image as ImageIcon, Loader2, RotateCcw } from "lucide-react";
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

type Section = {
  key: keyof FormState;
  number: string;
  title: string;
  guide: string;
  placeholder: string;
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

function buildCrisisImagePrompt(form: FormState) {
  const customerInfo = buildCustomerInfo(form);
  const age = extractAge(form.family);
  const monthlyNisa = extractMonthlyNisa(form.assets);
  const ageInsight = buildAgeInsight(age, monthlyNisa);

  return `以下のお客様情報をもとに、ライフプラン危機感画像を今すぐ生成してください。

【目的】
お客様が「今のままだと、理想の暮らしに対して将来のお金が足りないかもしれない」と直感的にわかる1枚画像にする。
ただし、何かを売るための雰囲気、特定の商品やサービスへの誘導、押しつけ、断定、人格や家計管理を責める表現は入れない。

【画像の見た目】
・16:9横長のインフォグラフィック
・白背景、紺の見出し、黄色の注意帯、赤は重要な不足額と赤字化ポイントだけに限定する
・赤の面積は多くしすぎない。全体の15〜20%程度まで
・添付イメージのように、上部に大きなタイトル、家族状況、前提条件、教育費、老後不足額、トータル不足額のボックスを並べる
・家族構成に合わせて、上部左側に家族が並んでいるやさしいイラストを入れる
・家族イラストは、入力された家族構成に合わせる。夫婦、子どもの人数、子どもの年齢感が伝わるようにする。写真風ではなく、明るいフラットイラスト
・中央から下は年表テーブルにする
・年表の列は、年、本人年齢、子ども年齢、ライフイベント、年間必要額、将来不足額、累計不足額、危険ポイント
・世帯年収や年間収支がプラスに見える列は作らない
・黒字、プラス収支、余裕があるように見える表現は避ける
・すべて「必要になるお金」「不足する可能性があるお金」「準備しないと足りないお金」に変換して見せる
・赤字になる年、教育費ピーク、大学在学中、老後開始は赤や黄色の帯で強調する
・最下部に「このままだと...」から始まる強い結論帯を入れる

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

function buildIdealImagePrompt(form: FormState) {
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
・左下：見出し「刺さる相手が見えてくる」。A/B/Cの3階層ターゲットをカードで並べる
・さらに下：見出し「発信設計に落とし込む」。参考アカウントの型、代表動画の構成、投稿ネタを小さなアイコンで置く
・右上：大きなピンクの帯で「あなたの経験は、誰かの共感や学びになる」
・右側メイン：家族構成に合わせた本人と家族が、理想の未来を楽しんでいる大きめのイラスト。旅行、海辺、子どもの体験、家族時間など、入力内容に合う場面にする
・右下：チェック付きカードを3つ並べる。「同じ状況の人に刺さる」「同じ悩みの人に刺さる」「同じ人生テーマの人に刺さる」のように、A/B/Cの意味が伝わる言葉にする
・最下部：手書きのハートを添えて、締めのメッセージを入れる

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

【画像内の構成】
上部：〇〇さんのライフスタイル発信設計
左側：強み、経験、感情が動いた瞬間、発信素材
中央：刺さるターゲットA/B/C
右側：参考アカウントの型、代表動画構成、投稿ネタ
下部：上記のセリフを大きく配置

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

export function LifePlanRiskMapClient() {
  const [form, setForm] = useState<FormState>(initialForm);
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
  const crisisPrompt = useMemo(() => buildCrisisImagePrompt(form), [form]);
  const idealPrompt = useMemo(() => buildIdealImagePrompt(form), [form]);

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setForm(initialForm);
    setGenerationError("");
    setGeneratedImage(null);
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
          </div>

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
                <p className="text-xs font-bold text-stone-500">入力済み</p>
                <p className="mt-1 text-3xl font-black text-stone-950">
                  {filledCount} / {sections.length}
                </p>
              </div>
              <div className="rounded-md border border-stone-200 bg-white p-4">
                <p className="text-xs font-bold text-stone-500">次にやること</p>
                <p className="mt-2 text-sm font-bold leading-6 text-stone-700">
                  全体を確認したら、用途に合わせて下のボタンを押し、ChatGPTの画像生成に貼り付けます。
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <CopyButton text={crisisPrompt} label="危機感画像用テキストをコピー" />
              <CopyButton text={idealPrompt} label="ライフスタイル訴求画像用テキストをコピー" />
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
                  危機感画像
                </button>
                <button
                  type="button"
                  onClick={() => generateImage("ideal")}
                  disabled={isGenerating}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  理想画像
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
                    alt={generatedImage.kind === "crisis" ? "生成された危機感画像" : "生成された理想画像"}
                    className="aspect-video w-full bg-stone-200 object-contain"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <p className="text-xs font-bold text-stone-500">
                      {generatedImage.kind === "crisis" ? "危機感画像" : "理想画像"}
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
