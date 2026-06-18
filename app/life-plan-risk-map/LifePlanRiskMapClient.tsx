"use client";

import { Eye, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type LifePlanRiskMapData = {
  clientName: string;
  familyImageLabel: string;
  currentStatus: string;
  incomeExpense: string;
  idealFuture: string;
  education: string;
  retirementGap: string;
  retirementPlan: string;
  themes: string;
  tableRows: Array<{
    year: string;
    age: string;
    childAge: string;
    event: string;
    needed: string;
    shortage: string;
    cumulative: string;
    risk: string;
    highlight?: "normal" | "yellow" | "red";
  }>;
  comparison: string;
  footerLead: string;
  footerBody: string;
};

const defaultRows: LifePlanRiskMapData["tableRows"] = [
  {
    year: "2026",
    age: "30歳",
    childAge: "-",
    event: "結婚・新生活準備",
    needed: "250万円",
    shortage: "250万円",
    cumulative: "250万円",
    risk: "結婚費用・新生活・家具・引っ越しでまとまった支出が出やすい",
  },
  {
    year: "2028",
    age: "32歳",
    childAge: "0歳",
    event: "第1子出産・育児開始",
    needed: "120万円",
    shortage: "120万円",
    cumulative: "370万円",
    risk: "出産費用、育児用品、働き方変化で負担が増えやすい",
  },
  {
    year: "2033",
    age: "37歳",
    childAge: "5歳",
    event: "住宅取得・注文住宅準備",
    needed: "400万円",
    shortage: "400万円",
    cumulative: "890万円",
    risk: "希望エリアの住宅費は準備額が大きくなりやすい",
  },
  {
    year: "2038",
    age: "42歳",
    childAge: "10歳",
    event: "習い事・英語教育・家族旅行",
    needed: "120万円",
    shortage: "120万円",
    cumulative: "1,010万円",
    risk: "教育と体験費が同時に増えやすい",
  },
  {
    year: "2048-2052",
    age: "52-56歳",
    childAge: "20-24歳",
    event: "大学在学中",
    needed: "220万円/年",
    shortage: "1,100万円",
    cumulative: "2,540万円",
    risk: "教育費ピークが続き、老後資金準備と重なりやすい",
    highlight: "yellow",
  },
  {
    year: "2061",
    age: "65歳",
    childAge: "33歳",
    event: "老後生活スタート",
    needed: "192万円/年",
    shortage: "192万円/年",
    cumulative: "2,932万円",
    risk: "年金だけではゆとりある暮らしに届かない可能性がある",
    highlight: "yellow",
  },
  {
    year: "2061-2090",
    age: "65-94歳",
    childAge: "33-62歳",
    event: "老後30年累計",
    needed: "5,760万円",
    shortage: "5,760万円",
    cumulative: "8,500万円超",
    risk: "教育費が終わっても、老後資金不足が長く続く可能性がある",
    highlight: "red",
  },
];

export const defaultRiskMapData: LifePlanRiskMapData = {
  clientName: "みなみさんご家族",
  familyImageLabel: "結婚予定のご夫婦イメージ",
  currentStatus: "みなみさん 29歳\n現在は2人暮らし想定\n貯金600万円\nNISA積立 月33万円\n65歳まで残り36年",
  incomeExpense: "年収800万円\nパートナー年収1,500万円\n家賃25万円/月\n食費35万円/月\n光熱・通信7万円/月",
  idealFuture: "結婚後、子どもに英才教育を受けさせたい\nゆりたいことを時間とお金の制限なく応援したい\n品川・目黒エリアで注文住宅\n家族や友人に制限なくGiveしたい",
  education: "子ども1人\n1,000〜2,000万円\n2人なら2,000〜4,000万円",
  retirementGap: "年金 月22万円\nゆとりある生活費 月38万円\n月16万円不足\n30年間では約5,760万円不足",
  retirementPlan: "65歳まで残り36年\n3,000万円準備 月6.9万円が目安\n5,000万円準備 月11.6万円が目安\n現在NISA 月33万円",
  themes: "結婚・出産・新生活：400〜600万円規模\n住宅：希望エリアなら6,000万円規模\n車：人生全体で1,500〜2,500万円\n教育費＋老後だけでも6,760〜7,760万円規模",
  tableRows: defaultRows,
  comparison:
    "教育費：1,000〜2,000万円/人\n住宅：6,000万円規模\n車：1,500〜2,500万円規模\n老後：5,760万円不足\n現在の準備：NISA 月33万円 / 現金 月5万円 / 貯金600万円",
  footerLead: "このままだと...",
  footerBody:
    "教育費・老後・住宅・車・旅行の支出が重なり、理想の未来に対して大きな不足が見える可能性があります。早めに見える化しておくことで、家族の選択肢を守りやすくなります。",
};

const fieldGroups = [
  ["clientName", "タイトル"] as const,
  ["familyImageLabel", "人物下ラベル"] as const,
  ["currentStatus", "1 現在の状況"] as const,
  ["incomeExpense", "2 収入と今の支出"] as const,
  ["idealFuture", "3 理想の未来"] as const,
  ["education", "4 教育費の目安"] as const,
  ["retirementGap", "5 老後の不足額イメージ"] as const,
  ["retirementPlan", "6 老後資金の準備目安"] as const,
  ["themes", "7 将来の大きな準備テーマ"] as const,
  ["comparison", "一般的な必要額との比較"] as const,
  ["footerLead", "下部の強調見出し"] as const,
  ["footerBody", "下部メッセージ"] as const,
];

type TextKey = Exclude<keyof LifePlanRiskMapData, "tableRows">;

function cloneDefault() {
  return {
    ...defaultRiskMapData,
    tableRows: defaultRiskMapData.tableRows.map((row) => ({ ...row })),
  };
}

export function LifePlanRiskMapClient() {
  const [data, setData] = useState<LifePlanRiskMapData>(() => cloneDefault());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const filledScore = useMemo(() => {
    const textCount = fieldGroups.filter(([key]) => data[key].trim()).length;
    const rowCount = data.tableRows.filter((row) => row.event.trim()).length;
    return Math.round(((textCount + rowCount) / (fieldGroups.length + data.tableRows.length)) * 100);
  }, [data]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "life-plan-risk-map:update", payload: data },
      window.location.origin,
    );
  }, [data]);

  const updateText = (key: TextKey, value: string) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const updateRow = (
    index: number,
    key: Exclude<keyof LifePlanRiskMapData["tableRows"][number], "highlight">,
    value: string,
  ) => {
    setData((current) => ({
      ...current,
      tableRows: current.tableRows.map((row, rowIndex) => (
        rowIndex === index ? { ...row, [key]: value } : row
      )),
    }));
  };

  const reset = () => setData(cloneDefault());

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="border-r border-slate-300 bg-white">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-slate-500">
                  Live Template
                </p>
                <h1 className="mt-1 text-xl font-black tracking-normal">
                  ライフプラン整理マップ
                </h1>
              </div>
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                title="初期値に戻す"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
                <span>入力反映</span>
                <span>{filledScore}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-slate-950 transition-all" style={{ width: `${filledScore}%` }} />
              </div>
            </div>
          </div>

          <div className="h-[calc(100vh-104px)] overflow-y-auto px-5 py-5">
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-950">
              左で文字を変えると、右の埋め込みページに即反映されます。画像生成ではなく固定構図なので、レイアウト品質がブレません。
            </div>

            <div className="space-y-4">
              {fieldGroups.map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-sm font-black text-slate-700">{label}</span>
                  <textarea
                    value={data[key]}
                    onChange={(event) => updateText(key, event.target.value)}
                    className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-950"
                  />
                </label>
              ))}
            </div>

            <div className="mt-7">
              <h2 className="text-base font-black">年表テーブル</h2>
              <div className="mt-3 space-y-4">
                {data.tableRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 text-sm font-black text-slate-700">行 {rowIndex + 1}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["year", "age", "childAge", "event", "needed", "shortage", "cumulative", "risk"] as const).map((key) => (
                        <label key={key} className={key === "risk" || key === "event" ? "col-span-2" : ""}>
                          <span className="text-xs font-bold text-slate-500">{key}</span>
                          <input
                            value={String(row[key] ?? "")}
                            onChange={(event) => updateRow(rowIndex, key, event.target.value)}
                            className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-slate-950"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col bg-slate-200">
          <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-white px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-700">
              <Eye className="h-4 w-4" />
              埋め込みプレビュー
            </div>
            <a
              href="/life-plan-risk-map/embed"
              target="_blank"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100"
            >
              別タブで開く
            </a>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">
            <iframe
              ref={iframeRef}
              title="ライフプラン整理マップ埋め込み"
              src="/life-plan-risk-map/embed"
              onLoad={() => {
                iframeRef.current?.contentWindow?.postMessage(
                  { type: "life-plan-risk-map:update", payload: data },
                  window.location.origin,
                );
              }}
              className="h-[calc(100vh-86px)] min-h-[620px] w-full rounded-md border border-slate-300 bg-white shadow-sm"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
