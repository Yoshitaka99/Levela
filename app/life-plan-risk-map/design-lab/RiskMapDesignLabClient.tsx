"use client";

import { Download, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";

type TimelineRow = {
  year: string;
  age: string;
  childAge: string;
  event: string;
  need: string;
  gap: string;
  total: string;
  risk: string;
  tone?: "base" | "focus" | "danger";
};

type DesignData = {
  title: string;
  subtitle: string;
  familyLabel: string;
  cards: string[];
  comparison: string[];
  footerLead: string;
  footerBody: string;
  rows: TimelineRow[];
};

const initialData: DesignData = {
  title: "みなみさんの生涯ライフプラン年棒",
  subtitle: "今の生活費だけでは見えにくい、将来必要なお金の見える化（概算）",
  familyLabel: "結婚予定のご夫婦イメージ",
  cards: [
    "みなみさん 29歳\nパートナー 29歳\n現在は2人暮らし想定\n資産・貯金600万円\nNISA積立 月33万円\n65歳まで残り36年",
    "みなみさん 年収800万円\nパートナー 年収1,500万円\n家賃 25万円/月\n食費 35万円/月\n光熱・雑費 7万円/月",
    "結婚後、子どもに英才教育\nやりたいことを時間とお金の制限なく応援\n品川・目黒エリアで注文住宅\n家族や友人に制限なくGiveしたい",
    "子ども1人\n1,000〜2,000万円\n2人なら2,000〜4,000万円\n英語教育・習い事・留学まで考えると上限寄りになりやすい",
    "年金 月22万円\nゆとりある老後生活費 月38万円前後\n月16万円不足\n30年間では約5,760万円不足",
    "65歳まで残り36年\n3,000万円準備 月6.9万円が目安\n5,000万円準備 月11.6万円が目安\n現在NISA 月33万円",
    "結婚・出産・新生活：400〜600万円規模\n住宅：6,000万円規模\n車：1,500〜2,500万円規模\n教育費＋老後だけでも6,760〜7,760万円規模",
  ],
  comparison: [
    "教育費：1,000〜2,000万円/人",
    "住宅：6,000万円規模",
    "車：1,500〜2,500万円規模",
    "老後：5,760万円不足",
    "現在の準備：NISA 月33万円 / 現金 月5万円 / 貯金600万円",
  ],
  footerLead: "このままだと...",
  footerBody:
    "教育費・老後・住宅・車・旅行の支出が重なり、理想の未来に対して大きな不足が見える可能性があります。早めに見える化しておくことで、家族の選択肢を守りやすくなります。",
  rows: [
    {
      year: "2026年9月（3ヶ月後）",
      age: "30歳",
      childAge: "-",
      event: "現状整理・家計確認",
      need: "2,300万円",
      gap: "900万円",
      total: "1,400万円",
      risk: "収入・支出・固定費の現在地をまず見える化",
    },
    {
      year: "2026年12月（半年後）",
      age: "30歳",
      childAge: "-",
      event: "結婚・新生活準備",
      need: "2,300万円",
      gap: "950万円",
      total: "1,350万円",
      risk: "初期費用と生活費の変化に注意",
    },
    {
      year: "2027年6月（1年後）",
      age: "31歳",
      childAge: "-",
      event: "新生活安定・将来準備",
      need: "2,300万円",
      gap: "1,000万円",
      total: "1,300万円",
      risk: "毎月差分を資産形成へ回せるか確認",
    },
    {
      year: "2029年6月（3年後）",
      age: "33歳",
      childAge: "0歳",
      event: "出産・育児・住宅検討",
      need: "2,300万円",
      gap: "1,150万円",
      total: "1,150万円",
      risk: "働き方変化と支出増が重なりやすい",
    },
    {
      year: "2031年6月（5年後）",
      age: "35歳",
      childAge: "2歳",
      event: "教育・住まい・車",
      need: "2,300万円",
      gap: "1,250万円",
      total: "1,050万円",
      risk: "イベントごとの支出が大きくなる",
      tone: "focus",
    },
    {
      year: "2046年頃",
      age: "50歳",
      childAge: "17歳",
      event: "教育費ピーク",
      need: "2,300万円",
      gap: "1,450万円",
      total: "850万円",
      risk: "進学準備で支出が上がりやすい",
      tone: "focus",
    },
    {
      year: "2061年頃",
      age: "65歳",
      childAge: "32歳",
      event: "老後生活スタート",
      need: "264万円",
      gap: "456万円",
      total: "-192万円",
      risk: "年金だけでは理想生活に届きにくい",
      tone: "danger",
    },
  ],
};

const cardTitles = [
  "現在の状況",
  "収入と今の支出",
  "理想の未来",
  "教育費の目安",
  "老後の不足額イメージ",
  "老後資金の準備目安",
  "将来の大きな準備テーマ",
];

const navy = "#0A2D63";
const red = "#D9232E";
const gold = "#F7C948";
const ink = "#111827";

function splitLines(value: string, maxChars: number, maxLines: number) {
  const rawLines = value.split(/\r?\n/).flatMap((line) => {
    const clean = line.trim();
    if (!clean) return [];
    const chunks: string[] = [];
    let current = "";

    for (const char of clean) {
      current += char;
      if (current.length >= maxChars) {
        chunks.push(current);
        current = "";
      }
    }
    if (current) chunks.push(current);
    return chunks;
  });

  return rawLines.slice(0, maxLines);
}

function TextBlock({
  x,
  y,
  lines,
  size,
  color = ink,
  weight = 700,
  lineHeight,
  anchor = "start",
}: {
  x: number;
  y: number;
  lines: string[];
  size: number;
  color?: string;
  weight?: number;
  lineHeight?: number;
  anchor?: "start" | "middle";
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      fill={color}
      textAnchor={anchor}
      fontFamily={'"Yu Gothic", "Meiryo", "Hiragino Sans", Arial, sans-serif'}
    >
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight ?? size * 1.32}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function FamilyArt() {
  return (
    <g transform="translate(32 86)">
      <path d="M64 0 C38 4 20 26 24 62 C32 40 49 32 80 36 C104 39 122 54 126 76 C138 34 108 -6 64 0Z" fill="#8A5A44" />
      <circle cx="76" cy="76" r="45" fill="#FFE2C3" />
      <circle cx="59" cy="74" r="5" fill="#0B1F3A" />
      <circle cx="93" cy="74" r="5" fill="#0B1F3A" />
      <path d="M61 96 Q76 107 93 96" fill="none" stroke="#0B1F3A" strokeWidth="5" strokeLinecap="round" />
      <path d="M16 210 C22 142 48 122 82 124 C118 126 143 152 150 210 L16 210Z" fill="#FFF3E5" stroke={navy} strokeWidth="4" />

      <path d="M166 6 C134 13 122 36 128 64 C136 42 154 36 184 40 C212 44 228 58 236 84 C251 37 222 -2 166 6Z" fill="#3F2B24" />
      <circle cx="180" cy="80" r="45" fill="#FFE2C3" />
      <circle cx="164" cy="78" r="5" fill="#0B1F3A" />
      <circle cx="198" cy="78" r="5" fill="#0B1F3A" />
      <path d="M165 100 Q181 111 199 100" fill="none" stroke="#0B1F3A" strokeWidth="5" strokeLinecap="round" />
      <path d="M105 210 C112 140 144 122 184 124 C224 126 252 154 260 210 L105 210Z" fill="#EAF1FA" stroke={navy} strokeWidth="4" />
      <path d="M172 150 L207 150 L190 206 Z" fill={navy} />
    </g>
  );
}

function InfoCard({
  index,
  x,
  y,
  width,
  title,
  body,
  emphasis,
}: {
  index: number;
  x: number;
  y: number;
  width: number;
  title: string;
  body: string;
  emphasis?: boolean;
}) {
  const bodyLines = splitLines(body, index === 4 || index === 5 ? 13 : 16, 7);

  return (
    <g>
      <rect x={x} y={y} width={width} height={254} rx={13} fill="#FFFFFF" stroke={navy} strokeWidth={3} />
      <rect x={x + 15} y={y + 13} width={32} height={32} rx={6} fill={navy} />
      <text x={x + 31} y={y + 38} textAnchor="middle" fontSize={21} fontWeight={900} fill="#FFF">
        {index}
      </text>
      <TextBlock x={x + 58} y={y + 37} lines={[title]} size={20} color={navy} weight={900} />
      {index === 4 ? (
        <TextBlock x={x + width / 2} y={y + 90} lines={bodyLines} size={29} color={red} weight={900} lineHeight={38} anchor="middle" />
      ) : (
        <TextBlock x={x + 18} y={y + 80} lines={bodyLines.map((line) => `・${line}`)} size={16} color={emphasis ? red : ink} weight={800} lineHeight={27} />
      )}
    </g>
  );
}

function PhaseBand() {
  const phases = [
    ["30代前半：結婚・新生活・住宅準備の重なり", red, "#FFF7ED"],
    ["40代後半〜50代前半：教育費ピーク", ink, "#FFFBEB"],
    ["65歳以降：毎月16万円不足の老後", red, "#FFF7ED"],
  ];

  return (
    <g transform="translate(16 372)">
      <rect x={0} y={0} width={300} height={52} rx={8} fill={navy} />
      <text x={150} y={35} textAnchor="middle" fontSize={24} fontWeight={900} fill="#FFF">
        家計が苦しくなりやすい時期
      </text>
      {phases.map(([label, color, fill], index) => (
        <g key={label} transform={`translate(${320 + index * 485} 0)`}>
          <rect width={468} height={52} rx={8} fill={fill} stroke="#F59E0B" strokeWidth={2} />
          <text x={234} y={35} textAnchor="middle" fontSize={24} fontWeight={900} fill={color}>
            {label}
          </text>
        </g>
      ))}
    </g>
  );
}

function TimelineTable({ rows }: { rows: TimelineRow[] }) {
  const columns = [
    ["年", 105],
    ["本人年齢", 104],
    ["子ども年齢", 150],
    ["ライフイベント", 235],
    ["収入", 118],
    ["支出", 118],
    ["差分", 130],
    ["気付きポイント", 388],
  ] as const;
  const startX = 16;
  const startY = 438;
  const rowH = 49;
  let xCursor = startX;

  return (
    <g>
      {columns.map(([label, width]) => {
        const x = xCursor;
        xCursor += width;
        return (
          <g key={label}>
            <rect x={x} y={startY} width={width} height={rowH} fill={navy} stroke={navy} strokeWidth={2} />
            <text x={x + width / 2} y={startY + 32} textAnchor="middle" fontSize={19} fontWeight={900} fill="#FFF">
              {label}
            </text>
          </g>
        );
      })}
      {rows.map((row, rowIndex) => {
        const values = [row.year, row.age, row.childAge, row.event, row.need, row.gap, row.total, row.risk];
        const fill = row.tone === "danger" ? red : row.tone === "focus" ? "#FDE68A" : "#FFFFFF";
        const baseColor = row.tone === "danger" ? "#FFFFFF" : ink;
        let rowX = startX;

        return (
          <g key={`${row.year}-${rowIndex}`}>
            {columns.map(([, width], colIndex) => {
              const x = rowX;
              rowX += width;
              const isMoney = colIndex === 5 || colIndex === 6;
              const isRisk = colIndex === 7;
              const textColor = row.tone === "danger" ? "#FFFFFF" : isMoney ? red : baseColor;
              return (
                <g key={`${rowIndex}-${colIndex}`}>
                  <rect x={x} y={startY + rowH * (rowIndex + 1)} width={width} height={rowH} fill={fill} stroke={navy} strokeWidth={2} />
                  {isRisk ? (
                    <TextBlock
                      x={x + 10}
                      y={startY + rowH * (rowIndex + 1) + 20}
                      lines={splitLines(values[colIndex], 20, 2)}
                      size={15}
                      color={textColor}
                      weight={800}
                      lineHeight={19}
                    />
                  ) : (
                    <text
                      x={x + width / 2}
                      y={startY + rowH * (rowIndex + 1) + 31}
                      textAnchor="middle"
                      fontSize={colIndex === 3 ? 17 : 18}
                      fontWeight={isMoney || row.tone === "danger" ? 900 : 800}
                      fill={textColor}
                    >
                      {values[colIndex]}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

function Comparison({ lines }: { lines: string[] }) {
  return (
    <g transform="translate(1378 438)">
      <rect width={406} height={392} rx={12} fill="#FFFFFF" stroke={navy} strokeWidth={3} />
      <rect width={406} height={56} rx={12} fill={navy} />
      <text x={203} y={37} textAnchor="middle" fontSize={23} fontWeight={900} fill="#FFF">
        一般的な必要額との比較
      </text>
      {lines.slice(0, 6).map((line, index) => (
        <g key={line} transform={`translate(28 ${92 + index * 52})`}>
          <circle cx={10} cy={-7} r={7} fill={line.includes("老後") || line.includes("不足") ? red : navy} />
          <TextBlock
            x={30}
            y={0}
            lines={splitLines(line, 22, 2)}
            size={22}
            color={line.includes("老後") || line.includes("不足") ? red : ink}
            weight={900}
            lineHeight={26}
          />
        </g>
      ))}
      <rect x={28} y={304} width={350} height={2} fill="#CBD5E1" />
      <TextBlock
        x={30}
        y={344}
        lines={splitLines("積立がある場合でも、教育・住宅・旅行・老後まで含めると必要額との差は見えにくい状態。人生全体で必要になるお金として整理することが大切です。", 24, 3)}
        size={17}
        color={red}
        weight={900}
        lineHeight={22}
      />
    </g>
  );
}

function RiskMapSvg({ data, svgRef }: { data: DesignData; svgRef: React.RefObject<SVGSVGElement | null> }) {
  const cardWidth = 214;
  const cardStartX = 270;

  return (
    <svg
      ref={svgRef}
      width="1800"
      height="1012"
      viewBox="0 0 1800 1012"
      xmlns="http://www.w3.org/2000/svg"
      className="block h-auto w-[1800px]"
    >
      <rect width="1800" height="1012" fill="#F8FAFC" />
      <rect x="8" y="8" width="1784" height="996" rx="18" fill="#FFFFFF" stroke="#D7DEE8" strokeWidth="2" />
      <text x="900" y="53" textAnchor="middle" fontSize="45" fontWeight="900" fill={navy} fontFamily={'"Yu Gothic", "Meiryo", sans-serif'}>
        {data.title}
      </text>
      <text x="900" y="83" textAnchor="middle" fontSize="20" fontWeight="900" fill={ink} fontFamily={'"Yu Gothic", "Meiryo", sans-serif'}>
        {data.subtitle}
      </text>

      <FamilyArt />
      <rect x="18" y="318" width="242" height="44" rx="8" fill={navy} />
      <TextBlock x={139} y={347} lines={[data.familyLabel]} size={19} color="#FFFFFF" weight={900} anchor="middle" />

      {data.cards.map((body, index) => (
        <InfoCard
          key={cardTitles[index]}
          index={index + 1}
          x={cardStartX + index * (cardWidth + 10)}
          y={94}
          width={cardWidth}
          title={cardTitles[index]}
          body={body}
          emphasis={index === 0 || index === 1 || index === 4 || index === 6}
        />
      ))}

      <PhaseBand />
      <TimelineTable rows={data.rows} />
      <Comparison lines={data.comparison} />

      <g transform="translate(16 852)">
        <rect width="1768" height="128" rx="18" fill={navy} />
        <ellipse cx="160" cy="64" rx="145" ry="50" fill="#FFFFFF" />
        <TextBlock x={160} y={78} lines={[data.footerLead]} size={38} color={red} weight={900} anchor="middle" />
        <TextBlock
          x={344}
          y={51}
          lines={splitLines(data.footerBody, 48, 3)}
          size={26}
          color="#FFFFFF"
          weight={900}
          lineHeight={35}
        />
        <path d="M1686 38 L1738 108 L1634 108 Z" fill={gold} stroke={ink} strokeWidth={5} />
        <text x="1686" y="99" textAnchor="middle" fontSize="56" fontWeight="900" fill={ink}>
          !
        </text>
      </g>
    </svg>
  );
}

export function RiskMapDesignLabClient() {
  const [data, setData] = useState<DesignData>(initialData);
  const [zoom, setZoom] = useState(0.62);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const updateCard = (index: number, value: string) => {
    setData((current) => ({
      ...current,
      cards: current.cards.map((card, cardIndex) => (cardIndex === index ? value : card)),
    }));
  };

  const updateRow = (index: number, key: keyof TimelineRow, value: string) => {
    setData((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    }));
  };

  const downloadPng = async () => {
    const svg = svgRef.current;
    if (!svg) return;

    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 1012;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.download = "life-plan-risk-map-design.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    image.src = url;
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[410px_minmax(0,1fr)]">
        <aside className="border-r border-slate-300 bg-white">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-slate-500">Design Lab</p>
                <h1 className="mt-1 text-xl font-black tracking-normal">ライフプラン整理マップ</h1>
              </div>
              <button
                type="button"
                onClick={() => setData(initialData)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                title="初期値に戻す"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={downloadPng}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              PNG保存
            </button>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0.5, 0.62, 1].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setZoom(value)}
                  className={`h-9 rounded-md border text-xs font-black ${
                    zoom === value
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {Math.round(value * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div className="h-[calc(100vh-145px)] space-y-5 overflow-y-auto p-5">
            <label className="block">
              <span className="text-sm font-black text-slate-700">タイトル</span>
              <input
                value={data.title}
                onChange={(event) => setData((current) => ({ ...current, title: event.target.value }))}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-slate-700">サブタイトル</span>
              <textarea
                value={data.subtitle}
                onChange={(event) => setData((current) => ({ ...current, subtitle: event.target.value }))}
                className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-slate-950"
              />
            </label>

            {data.cards.map((card, index) => (
              <label key={cardTitles[index]} className="block">
                <span className="text-sm font-black text-slate-700">
                  {index + 1}. {cardTitles[index]}
                </span>
                <textarea
                  value={card}
                  onChange={(event) => updateCard(index, event.target.value)}
                  className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-slate-950"
                />
              </label>
            ))}

            <div>
              <h2 className="text-sm font-black text-slate-700">年表</h2>
              <div className="mt-2 space-y-3">
                {data.rows.map((row, rowIndex) => (
                  <div key={`${row.year}-${rowIndex}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-xs font-black text-slate-500">行 {rowIndex + 1}</div>
                    {(["year", "age", "childAge", "event", "need", "gap", "total", "risk"] as const).map((key) => (
                      <input
                        key={key}
                        value={String(row[key])}
                        onChange={(event) => updateRow(rowIndex, key, event.target.value)}
                        className="mb-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:border-slate-950"
                        aria-label={`${rowIndex + 1}-${key}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 overflow-auto bg-slate-200 p-5">
          <div
            className="rounded-md bg-white shadow-xl"
            style={{ width: 1800 * zoom, height: 1012 * zoom }}
          >
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
              <RiskMapSvg data={data} svgRef={svgRef} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
