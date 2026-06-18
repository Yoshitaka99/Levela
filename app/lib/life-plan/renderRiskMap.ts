import sharp from "sharp";

export type LifePlanRiskMapForm = {
  family?: string;
  income?: string;
  expenses?: string;
  assets?: string;
  education?: string;
  idealsBeforeRetirement?: string;
  retirement?: string;
  strengths?: string;
};

const WIDTH = 1800;
const HEIGHT = 970;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function amountFrom(text = "", label: string) {
  const line = text
    .split(/\r?\n/)
    .find((item) => item.replace(/\s/g, "").includes(label));

  if (!line) return 0;

  const match = line.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function firstNumber(text = "") {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function extractAge(text = "", label: string) {
  const normalized = text.replace(/\s/g, "");
  const match = normalized.match(new RegExp(`${label}[：:]?(\\d{2})歳`));
  return match ? Number(match[1]) : 0;
}

function extractChildrenAges(text = "") {
  const childLine = text
    .split(/\r?\n/)
    .find((line) => line.includes("子ども") || line.includes("子供"));

  if (!childLine) return [];

  return Array.from(childLine.matchAll(/(\d{1,2})歳/g)).map((match) => Number(match[1]));
}

function wrapText(text: string, maxChars: number, maxLines = 4) {
  const normalized = text.replace(/\r/g, "").replace(/\s+/g, " ").trim();
  const lines: string[] = [];
  let current = "";

  for (const char of normalized) {
    current += char;
    if (current.length >= maxChars) {
      lines.push(current);
      current = "";
    }
    if (lines.length >= maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function textLines({
  x,
  y,
  lines,
  size,
  fill = "#111827",
  weight = 700,
  lineHeight,
}: {
  x: number;
  y: number;
  lines: string[];
  size: number;
  fill?: string;
  weight?: number;
  lineHeight?: number;
}) {
  return lines
    .map((line, index) => (
      `<text x="${x}" y="${y + index * (lineHeight ?? size * 1.35)}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`
    ))
    .join("");
}

function bulletLines(lines: string[], x: number, y: number, maxChars = 18) {
  return lines
    .flatMap((line) => wrapText(line, maxChars, 2))
    .slice(0, 5)
    .map((line, index) => (
      `<text x="${x}" y="${y + index * 28}" font-size="19" font-weight="700" fill="#111827">・${escapeXml(line)}</text>`
    ))
    .join("");
}

function card(index: number, x: number, y: number, w: number, h: number, title: string, body: string[]) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#fff" stroke="#0b2a5b" stroke-width="3"/>
    <rect x="${x + 16}" y="${y + 12}" width="28" height="28" rx="5" fill="#0b2a5b"/>
    <text x="${x + 30}" y="${y + 34}" text-anchor="middle" font-size="20" font-weight="900" fill="#fff">${index}</text>
    <text x="${x + 56}" y="${y + 35}" font-size="21" font-weight="900" fill="#0b2a5b">${escapeXml(title)}</text>
    ${bulletLines(body, x + 22, y + 76, 10)}
  `;
}

function familyIllustration(x: number, y: number) {
  return `
    <g transform="translate(${x} ${y})">
      <rect x="0" y="238" width="230" height="44" rx="8" fill="#0b2a5b"/>
      <text x="115" y="268" text-anchor="middle" font-size="23" font-weight="900" fill="#fff">結婚予定のご夫婦イメージ</text>
      <g>
        <circle cx="82" cy="70" r="42" fill="#f7c59f"/>
        <path d="M42 64 C42 20 76 4 106 22 C126 34 135 55 123 91 C108 64 72 58 42 64Z" fill="#5f3b2e"/>
        <path d="M30 136 C38 96 127 96 136 136 L150 230 L16 230Z" fill="#fff7ed" stroke="#0b2a5b" stroke-width="2"/>
        <circle cx="69" cy="75" r="4" fill="#111827"/>
        <circle cx="96" cy="75" r="4" fill="#111827"/>
        <path d="M68 98 Q82 110 100 98" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
      </g>
      <g transform="translate(92 0)">
        <circle cx="82" cy="70" r="42" fill="#f4c7a1"/>
        <path d="M43 63 C48 24 77 6 114 20 C136 42 130 72 123 92 C103 63 70 58 43 63Z" fill="#35251f"/>
        <path d="M28 136 C38 96 126 96 138 136 L150 230 L10 230Z" fill="#e9eef7" stroke="#0b2a5b" stroke-width="2"/>
        <path d="M60 139 L81 194 L105 139" fill="#0b2a5b"/>
        <circle cx="69" cy="75" r="4" fill="#111827"/>
        <circle cx="96" cy="75" r="4" fill="#111827"/>
        <path d="M68 98 Q82 110 100 98" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
      </g>
    </g>
  `;
}

function tableCell(x: number, y: number, w: number, h: number, text: string, options?: {
  fill?: string;
  color?: string;
  size?: number;
  weight?: number;
  align?: "start" | "middle";
}) {
  const fill = options?.fill ?? "#ffffff";
  const color = options?.color ?? "#111827";
  const size = options?.size ?? 21;
  const weight = options?.weight ?? 700;
  const align = options?.align ?? "middle";
  const tx = align === "middle" ? x + w / 2 : x + 14;

  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#0b2a5b" stroke-width="2"/>
    ${textLines({
      x: tx,
      y: y + 31,
      lines: wrapText(text, align === "middle" ? 10 : 24, 2),
      size,
      fill: color,
      weight,
      lineHeight: 27,
    }).replaceAll("<text ", `<text text-anchor="${align}" `)}
  `;
}

export async function renderLifePlanRiskMapPng(form: LifePlanRiskMapForm) {
  const currentYear = 2026;
  const personAge = extractAge(form.family, "本人") || firstNumber(form.family) || 30;
  const spouseAge = extractAge(form.family, "配偶者");
  const childAges = extractChildrenAges(form.family);
  const yearsTo65 = Math.max(1, 65 - personAge);
  const monthlyIncome = amountFrom(form.income, "本人月収") + amountFrom(form.income, "配偶者月収");
  const bonus = amountFrom(form.income, "ボーナス");
  const annualIncome = Math.round(monthlyIncome * 12 + bonus);
  const monthlyExpenses = amountFrom(form.expenses, "生活費") || 28;
  const housing = amountFrom(form.expenses, "住宅ローン") || amountFrom(form.expenses, "家賃") || 9;
  const nisaMonthly = amountFrom(form.assets, "NISA") || 0;
  const savings = amountFrom(form.assets, "貯金") || 0;
  const targetRetirementMonthly = amountFrom(form.retirement, "生活費") || firstNumber(form.retirement) || 38;
  const pensionMonthly = 22;
  const retirementGap = Math.max(0, targetRetirementMonthly - pensionMonthly);
  const retirementTotalGap = retirementGap * 12 * 30;
  const educationMin = childAges.length * 1000 || 1000;
  const educationMax = childAges.length * 2000 || 2000;
  const totalThemeMin = educationMin + retirementTotalGap + 1000;
  const totalThemeMax = educationMax + retirementTotalGap + 1000;

  const topY = 96;
  const cardW = 188;
  const gap = 8;
  const cardsX = 270;
  const familyText = [
    `本人 ${personAge}歳${spouseAge ? ` / 配偶者 ${spouseAge}歳` : ""}`,
    childAges.length ? `子ども ${childAges.join("歳・")}歳` : "子ども 未入力",
    `65歳まで残り${yearsTo65}年`,
    `貯金 ${savings || "-"}万円`,
  ];
  const incomeText = [
    `年収 約${annualIncome || "-"}万円`,
    `月収 約${monthlyIncome || "-"}万円`,
    `生活費 ${monthlyExpenses}万円/月`,
    `住宅 ${housing}万円/月`,
  ];
  const idealText = [
    ...(form.idealsBeforeRetirement || "").split(/\r?\n/).filter(Boolean).slice(0, 4),
  ];
  const tableRows = [
    [currentYear, personAge, childAges.length ? childAges.join(" / ") : "-", "現在の家計整理", "250万円", "250万円", "250万円", "今の積立だけでは十分とは言い切れない"],
    [currentYear + 2, personAge + 2, childAges.map((age) => age + 2).join(" / ") || "-", "教育・育児コスト上昇", "120万円", "120万円", "370万円", "出費が重なりやすい時期"],
    [currentYear + 7, personAge + 7, childAges.map((age) => age + 7).join(" / ") || "-", "住宅・車・家族イベント", "400万円", "400万円", "890万円", "まとまった支出が出やすい"],
    [currentYear + 16, personAge + 16, childAges.map((age) => age + 16).join(" / ") || "-", "教育費ピーク", "180万円", "180万円", "1,190万円", "進学準備で教育費が上がりやすい"],
    [`${currentYear + 22}〜${currentYear + 26}`, `${personAge + 22}〜${personAge + 26}`, childAges.map((age) => `${age + 22}〜${age + 26}`).join(" / ") || "-", "大学在学中", "220万円/年", "1,100万円", "2,540万円", "教育費ピークが続く"],
    [currentYear + yearsTo65, 65, childAges.map((age) => age + yearsTo65).join(" / ") || "-", "老後生活スタート", `${retirementGap * 12}万円/年`, `${retirementGap * 12}万円/年`, `${Math.round(retirementTotalGap).toLocaleString()}万円`, "年金だけでは理想生活に届きにくい"],
    [`${currentYear + yearsTo65}〜`, "65歳〜", "-", "老後30年累計", `${Math.round(retirementTotalGap).toLocaleString()}万円`, `${Math.round(retirementTotalGap).toLocaleString()}万円`, `${Math.round(retirementTotalGap + educationMax).toLocaleString()}万円超`, "人生全体で必要額を見ることが大切"],
  ];

  const header = `
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#f8fafc"/>
    <text x="900" y="54" text-anchor="middle" font-size="48" font-weight="900" fill="#0b2a5b">みなみさんご家族のライフプラン整理</text>
    <text x="900" y="88" text-anchor="middle" font-size="24" font-weight="800" fill="#111827">今の生活費だけでは見えにくい、将来必要なお金の見える化（概算）</text>
  `;

  const cards = [
    card(1, cardsX, topY, cardW, 250, "現在の状況", familyText),
    card(2, cardsX + (cardW + gap) * 1, topY, cardW, 250, "収入と支出", incomeText),
    card(3, cardsX + (cardW + gap) * 2, topY, cardW + 36, 250, "理想の未来", idealText.length ? idealText : ["家族旅行", "家族時間", "働き方を整える"]),
    card(4, cardsX + (cardW + gap) * 3 + 36, topY, cardW, 250, "教育費", [`子ども${childAges.length || 1}人`, `${educationMin.toLocaleString()}〜${educationMax.toLocaleString()}万円`, "進学で大きく変動"]),
    card(5, cardsX + (cardW + gap) * 4 + 36, topY, cardW, 250, "老後不足", [`月${targetRetirementMonthly}万 - 年金${pensionMonthly}万`, `月${retirementGap}万円不足`, `30年で約${retirementTotalGap.toLocaleString()}万円`]),
    card(6, cardsX + (cardW + gap) * 5 + 36, topY, cardW, 250, "準備目安", [`残り${yearsTo65}年`, `NISA 月${nisaMonthly}万円`, "差額の見える化"]),
    card(7, cardsX + (cardW + gap) * 6 + 36, topY, cardW, 250, "大きな準備", [`教育＋老後だけで`, `${totalThemeMin.toLocaleString()}〜${totalThemeMax.toLocaleString()}万円規模`, "住宅・車・旅行も追加"]),
  ].join("");

  const phase = `
    <rect x="14" y="382" width="300" height="46" rx="7" fill="#0b2a5b"/>
    <text x="164" y="414" text-anchor="middle" font-size="27" font-weight="900" fill="#fff">家計が苦しくなりやすい時期</text>
    <rect x="330" y="382" width="455" height="46" rx="4" fill="#fff7ed" stroke="#f59e0b" stroke-width="2"/>
    <text x="558" y="414" text-anchor="middle" font-size="27" font-weight="900" fill="#b91c1c">！30代前半：結婚・新生活・住宅準備</text>
    <rect x="790" y="382" width="470" height="46" rx="4" fill="#fffbeb" stroke="#f59e0b" stroke-width="2"/>
    <text x="1025" y="414" text-anchor="middle" font-size="27" font-weight="900" fill="#111827">△40代後半〜50代前半：教育費ピーク</text>
    <rect x="1266" y="382" width="520" height="46" rx="4" fill="#fff7ed" stroke="#f59e0b" stroke-width="2"/>
    <text x="1526" y="414" text-anchor="middle" font-size="27" font-weight="900" fill="#b91c1c">！65歳以降：毎月${retirementGap}万円不足の老後</text>
  `;

  const colX = [14, 134, 238, 398, 628, 748, 868, 1000];
  const colW = [120, 104, 160, 230, 120, 120, 132, 350];
  const rowH = 46;
  const startY = 444;
  const tableHeader = ["年", "本人年齢", "子ども年齢", "ライフイベント", "年間必要額", "将来不足額", "累計不足額", "危険ポイント"];
  const table = [
    ...tableHeader.map((label, index) => tableCell(colX[index], startY, colW[index], rowH, label, {
      fill: "#0b2a5b",
      color: "#fff",
      size: 20,
      weight: 900,
    })),
    ...tableRows.map((row, rowIndex) => {
      const y = startY + rowH * (rowIndex + 1);
      const isYellow = rowIndex === 4;
      const isRed = rowIndex === 6;
      return row.map((value, colIndex) => tableCell(colX[colIndex], y, colW[colIndex], rowH, String(value), {
        fill: isRed ? "#dc2626" : isYellow ? "#fde68a" : "#fff",
        color: isRed ? "#fff" : colIndex >= 5 ? "#dc2626" : "#111827",
        size: colIndex === 7 ? 18 : 20,
        weight: isRed || colIndex >= 5 ? 900 : 700,
        align: colIndex >= 3 && colIndex !== 4 && colIndex !== 5 && colIndex !== 6 ? "start" : "middle",
      })).join("");
    }).join(""),
  ].join("");

  const comparisonX = 1365;
  const comparison = `
    <rect x="${comparisonX}" y="444" width="420" height="390" rx="8" fill="#fff" stroke="#0b2a5b" stroke-width="3"/>
    <rect x="${comparisonX}" y="444" width="420" height="50" rx="8" fill="#0b2a5b"/>
    <text x="${comparisonX + 210}" y="478" text-anchor="middle" font-size="25" font-weight="900" fill="#fff">一般的な必要額との比較</text>
    ${textLines({ x: comparisonX + 38, y: 540, lines: [`教育費：${educationMin.toLocaleString()}〜${educationMax.toLocaleString()}万円/人`, "住宅：6,000万円規模", "車：1,500〜2,500万円規模", `老後：約${retirementTotalGap.toLocaleString()}万円不足`], size: 26, weight: 900, lineHeight: 58 })}
    <rect x="${comparisonX + 30}" y="688" width="360" height="2" fill="#cbd5e1"/>
    ${textLines({ x: comparisonX + 38, y: 735, lines: wrapText(`積立がある場合でも、教育・住宅・旅行・老後まで含めると必要額との差は見えにくい状態です。人生全体で必要になるお金として整理することが大切です。`, 18, 5), size: 21, fill: "#b91c1c", weight: 900, lineHeight: 31 })}
  `;

  const footer = `
    <rect x="14" y="852" width="1772" height="104" rx="16" fill="#0b2a5b"/>
    <ellipse cx="166" cy="904" rx="142" ry="47" fill="#fff"/>
    <text x="166" y="917" text-anchor="middle" font-size="42" font-weight="900" fill="#b91c1c">このままだと...</text>
    <text x="350" y="892" font-size="31" font-weight="900" fill="#facc15">教育費・老後・住宅・車・旅行の支出が重なり、理想の未来に対して不足が見える可能性があります</text>
    <text x="350" y="930" font-size="25" font-weight="800" fill="#fff">早めに見える化しておくことで、家族の選択肢を守りやすくなります。</text>
    <path d="M1710 884 L1755 940 L1665 940 Z" fill="#facc15" stroke="#111827" stroke-width="5"/>
    <text x="1710" y="930" text-anchor="middle" font-size="52" font-weight="900" fill="#111827">!</text>
  `;

  const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    text { font-family: "Yu Gothic", "Meiryo", "Noto Sans JP", Arial, sans-serif; }
  </style>
  ${header}
  ${familyIllustration(18, 88)}
  ${cards}
  ${phase}
  ${table}
  ${comparison}
  ${footer}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
