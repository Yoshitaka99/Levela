import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/celic/dormswap/outputs/image_excel/dormswap_image_data.xlsx";
const outputPath = "C:/Users/celic/dormswap/outputs/image_excel/dormswap_image_data_schedule_adjusted.xlsx";

const members = [
  "芝隼人",
  "田仲由敬",
  "持木玲那",
  "木原桃香",
  "加藤陸",
  "河上まちこ",
  "五十嵐凌大",
  "早川大貴",
  "笠松佑衣",
  "和佐田舞緒",
  "関口愛里",
];
const bench = new Set(["持木玲那", "加藤陸", "河上まちこ", "五十嵐凌大"]);

const rows = {
  "芝隼人":       { apo:45, seated:19, contract:4, planned:1, hold:6, remain:13 },
  "田仲由敬":     { apo:59, seated:20, contract:5, planned:3, hold:4, remain:29 },
  "持木玲那":     { apo:0,  seated:0,  contract:0, planned:0, hold:0, remain:0  },
  "木原桃香":     { apo:0,  seated:0,  contract:0, planned:0, hold:0, remain:0  },
  "加藤陸":       { apo:26, seated:9,  contract:2, planned:0, hold:0, remain:14 },
  "河上まちこ":   { apo:5,  seated:2,  contract:0, planned:0, hold:1, remain:3  },
  "五十嵐凌大":   { apo:22, seated:15, contract:1, planned:0, hold:2, remain:2  },
  "早川大貴":     { apo:14, seated:4,  contract:1, planned:1, hold:0, remain:7  },
  "笠松佑衣":     { apo:30, seated:10, contract:3, planned:2, hold:3, remain:18 },
  "和佐田舞緒":   { apo:23, seated:11, contract:1, planned:3, hold:4, remain:10 },
  "関口愛里":     { apo:64, seated:20, contract:5, planned:3, hold:4, remain:35 },
};

function pct(n) {
  if (!Number.isFinite(n)) return "0.0%";
  return `${(n * 100).toFixed(1)}%`;
}
function round1(n) { return Math.round(n * 10) / 10; }

const kpis = members.map((name) => {
  const r = rows[name];
  const seatRate = r.apo ? r.seated / r.apo : 0;
  const closeSeat = r.seated ? r.contract / r.seated : 0;
  const closeApo = r.apo ? r.contract / r.apo : 0;
  const lost = Math.max(r.seated - r.contract - r.planned - r.hold, 0);
  const expected = round1(r.remain * 0.35);
  const type = bench.has(name) ? "ベンチ" : "通常";
  let comment = "改善前提で慎重に配分";
  if (type === "ベンチ") comment = "5/25から少量で再デビュー、後半で増加";
  else if (r.contract >= 5 || closeSeat >= 0.25) comment = "成約実績あり。追加アポ多め候補";
  else if (seatRate >= 0.45) comment = "着座率は高い。商談改善で伸び代あり";
  return { name, type, ...r, seatRate, closeSeat, closeApo, lost, expected, comment };
});

const benchAdds = { "持木玲那": 20, "加藤陸": 24, "河上まちこ": 20, "五十嵐凌大": 24 };
const benchTotal = Object.values(benchAdds).reduce((a, b) => a + b, 0);
const totalAdd = 264;
const normalTotal = totalAdd - benchTotal;
const normal = kpis.filter((x) => x.type === "通常");
const maxApo = Math.max(...normal.map((x) => x.apo), 1);
const maxContract = Math.max(...normal.map((x) => x.contract), 1);
const weighted = normal.map((x) => {
  const score =
    0.35 * (x.closeSeat / Math.max(...normal.map((n) => n.closeSeat), 0.01)) +
    0.25 * (x.seatRate / Math.max(...normal.map((n) => n.seatRate), 0.01)) +
    0.25 * (x.contract / maxContract) +
    0.15 * (x.apo / maxApo);
  return { name: x.name, score };
});
const scoreSum = weighted.reduce((a, b) => a + b.score, 0);
let alloc = Object.fromEntries(weighted.map((x) => [x.name, Math.round((x.score / scoreSum) * normalTotal)]));
let delta = normalTotal - Object.values(alloc).reduce((a, b) => a + b, 0);
weighted.sort((a, b) => b.score - a.score);
for (let i = 0; delta !== 0; i = (i + 1) % weighted.length) {
  alloc[weighted[i].name] += delta > 0 ? 1 : -1;
  delta += delta > 0 ? -1 : 1;
}
for (const [name, v] of Object.entries(benchAdds)) alloc[name] = v;

function risk(x, add) {
  if (x.type === "ベンチ") return add >= 10 ? "高" : "中";
  if (x.closeSeat >= 0.25 && x.seatRate >= 0.3) return "低";
  if (x.closeSeat === 0 || x.seated === 0) return "高";
  return "中";
}

const allocation = kpis.map((x) => {
  const add = alloc[x.name] ?? 0;
  const addExpected = round1(add * 0.35);
  return {
    ...x,
    add,
    addExpected,
    totalExpected: round1(x.expected + addExpected),
    risk: risk(x, add),
    allocComment: x.type === "ベンチ"
      ? "5/25開始。最初は少なめ、後半に段階増"
      : (add >= 35 ? "強メンバーとして多め配分" : "実績に応じて現実配分"),
  };
});

const top = (arr, key) => [...arr].sort((a, b) => b[key] - a[key])[0]?.name ?? "";
const totalRemainData = kpis.reduce((a, b) => a + b.remain, 0);
const existingExpected = round1(96 * 0.35);
const addExpected = round1(totalAdd * 0.35);
const totalExpected = round1(existingExpected + addExpected);

const blob = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(blob);

function ws(name) {
  const sheet = workbook.worksheets.getOrAdd(name);
  sheet.getRange("A1:Z200").clear({ applyTo: "all" });
  sheet.showGridLines = false;
  return sheet;
}
function setWidths(sheet, widths) {
  widths.forEach((w, i) => sheet.getRangeByIndexes(0, i, 1, 1).format.columnWidthPx = w);
}
function title(sheet, text, endCol) {
  sheet.getRange(`A1:${endCol}1`).merge();
  sheet.getRange("A1").values = [[text]];
  sheet.getRange("A1").format = { fill: "#0B3F66", font: { color: "#FFFFFF", bold: true, size: 18 }, horizontalAlignment: "center" };
  sheet.getRange("A1").format.rowHeightPx = 36;
}
function table(sheet, start, headers, data) {
  const cols = headers.length;
  const rowsN = data.length + 1;
  const range = sheet.getRangeByIndexes(start.r, start.c, rowsN, cols);
  range.values = [headers, ...data];
  sheet.getRangeByIndexes(start.r, start.c, 1, cols).format = {
    fill: "#C8D9F3",
    font: { bold: true },
    horizontalAlignment: "center",
  };
  range.format = {
    borders: {
      top: { style: "continuous", color: "#000000" },
      bottom: { style: "continuous", color: "#000000" },
      left: { style: "continuous", color: "#000000" },
      right: { style: "continuous", color: "#000000" },
      insideHorizontal: { style: "continuous", color: "#000000" },
      insideVertical: { style: "continuous", color: "#000000" },
    },
    font: { name: "Arial", size: 11 },
    verticalAlignment: "center",
  };
  return range;
}

let s = ws("全体サマリー");
title(s, "5月ローンチ 目標達成に向けた全体サマリー", "F");
setWidths(s, [240, 130, 240, 130, 240, 260]);
table(s, { r: 2, c: 0 }, ["項目", "数値", "補足"], [
  ["不足成約数", 124, "6月11日までに達成"],
  ["想定成約率", "35.0%", "追加アポ逆算に使用"],
  ["必要アポ数", 355, "124 ÷ 35%"],
  ["現在残アポ", 96, "前提値。元データ集計は91件"],
  ["追加必要アポ", 264, "実務上260〜264件で管理"],
  ["通常メンバー割り振り", normalTotal, "強い人へ傾斜配分"],
  ["ベンチ仮割り振り", benchTotal, "5/25から少量開始、後半増"],
  ["既存アポ成約期待値", existingExpected, "96 × 35%"],
  ["追加アポ成約期待値", addExpected, "264 × 35%"],
  ["合計想定成約数", totalExpected, "既存残アポ＋追加アポ"],
  ["目標達成までの不足見込み", round1(124 - totalExpected), "35%前提だと微差あり。成約率改善で埋める"],
]);
s.getRange("B6").formulas = [["=ROUNDUP(B4/0.35,0)"]];
s.getRange("B11").formulas = [["=ROUND(B7*0.35,1)"]];
s.getRange("B12").formulas = [["=ROUND(B8*0.35,1)"]];
s.getRange("B13").formulas = [["=ROUND(B11+B12,1)"]];
s.getRange("B14").formulas = [["=ROUND(B4-B13,1)"]];
table(s, { r: 2, c: 3 }, ["重要指標", "メンバー", "コメント"], [
  ["一番数字が強い", top(kpis, "contract"), "成約数ベース"],
  ["一番着座率が高い", top(kpis.filter(x => x.apo > 0), "seatRate"), "アポ対着座率"],
  ["一番成約率が高い", top(kpis.filter(x => x.seated > 0), "closeSeat"), "着座対成約率"],
  ["一番リスクが高い", "持木玲那", "未稼働。再デビュー条件確認"],
  ["最優先で動かす", "田仲由敬・関口愛里・笠松佑衣", "追加アポ多め候補"],
]);
s.getRange("A15:F17").values = [
  ["結論", "成約率・着座率・成約数が良いメンバーに多めにアポを配分する。", null, null, null, null],
  ["ベンチ方針", "ベンチメンバーは5/25からアポに入る前提。最初は少なめ、後半に徐々に増やす。", null, null, null, null],
  ["注意", "AI関連施策は本分析対象外。数字設計・人員配置・商談改善のみ扱う。", null, null, null, null],
];
s.getRange("B15:F15").merge();
s.getRange("B16:F16").merge();
s.getRange("B17:F17").merge();
s.getRange("A15:F17").format = { fill: "#FFF2CC", font: { bold: true }, wrapText: true };
s.getRange("A15:F17").format.rowHeightPx = 34;

s = ws("メンバー別KPI");
title(s, "メンバー別KPI", "N");
setWidths(s, [130, 80, 70, 70, 85, 70, 85, 95, 70, 70, 90, 120, 90, 280]);
table(s, { r: 2, c: 0 }, ["メンバー名","区分","アポ数","着座数","着座率","成約数","成約率(着座)","アポ対成約率","保留数","失注数","現在残アポ","既存成約期待値","評価","コメント"],
  kpis.map(x => [x.name,x.type,x.apo,x.seated,pct(x.seatRate),x.contract,pct(x.closeSeat),pct(x.closeApo),x.hold,x.lost,x.remain,x.expected,x.type === "ベンチ" ? "再デビュー枠" : (x.contract >= 3 ? "強" : "要改善"),x.comment]));

s = ws("通常メンバー分析");
title(s, "通常メンバー分析", "K");
setWidths(s, [130,70,70,85,70,90,90,110,110,90,260]);
table(s, { r: 2, c: 0 }, ["メンバー名","アポ数","着座数","着座率","成約数","成約率(着座)","残アポ","既存期待値","追加アポ案","リスク","コメント"],
  allocation.filter(x => x.type === "通常").map(x => [x.name,x.apo,x.seated,pct(x.seatRate),x.contract,pct(x.closeSeat),x.remain,x.expected,x.add,x.risk,x.allocComment]));

s = ws("ベンチメンバー分析");
title(s, "ベンチメンバー分析", "I");
setWidths(s, [130,170,150,120,130,150,260,170,260]);
table(s, { r: 2, c: 0 }, ["メンバー名","現在の状態","通常戦力カウント","戦力見込み","再デビュー期限","現実的アポ数","無理に持たせた場合のリスク","機能しない場合の上乗せ","コメント"],
  allocation.filter(x => x.type === "ベンチ").map(x => [x.name,"再デビュー前提","満額カウントしない","30〜60%","5/25",x.add,"商談品質・返信速度・ロープレ不足で失注増",`${x.add}件を通常メンバーへ再配分`,x.allocComment]));

s = ws("ランキング");
title(s, "ランキング", "I");
setWidths(s, [170,120,100,170,120,100,170,120,100]);
const rankings = [
  ["成約率が高い順","closeSeat", x => pct(x.closeSeat)],
  ["着座率が高い順","seatRate", x => pct(x.seatRate)],
  ["アポ数が多い順","apo", x => x.apo],
  ["成約数が多い順","contract", x => x.contract],
  ["残アポ数が多い順","remain", x => x.remain],
  ["成約期待値が高い順","expected", x => x.expected],
  ["改善余地が大きい順","lost", x => x.lost],
];
let rr = 2, cc = 0;
for (const [label, key, fmt] of rankings) {
  table(s, { r: rr, c: cc }, [label, "区分", "値"], [...kpis].sort((a,b)=>b[key]-a[key]).slice(0,6).map(x => [x.name, x.type, fmt(x)]));
  cc += 3;
  if (cc >= 9) { cc = 0; rr += 9; }
}

s = ws("追加アポ割り振り案");
title(s, "追加アポ割り振り案", "M");
setWidths(s, [130,80,85,95,110,85,90,120,130,130,130,90,280]);
table(s, { r: 2, c: 0 }, ["メンバー名","区分","現在アポ数","現在着座率","現在成約率","現在成約数","残アポ数","既存成約期待値","追加で持つアポ","追加想定成約数","合計想定成約数","リスク","コメント"],
  allocation.map(x => [x.name,x.type,x.apo,pct(x.seatRate),pct(x.closeSeat),x.contract,x.remain,x.expected,x.add,x.addExpected,x.totalExpected,x.risk,x.allocComment]));
s.getRange("A16:M16").values = [["合計","",kpis.reduce((a,b)=>a+b.apo,0),"","",kpis.reduce((a,b)=>a+b.contract,0),totalRemainData,round1(totalRemainData*0.35),totalAdd,addExpected,round1(totalRemainData*0.35+addExpected),"",""]];
s.getRange("A16:M16").format = { fill: "#FFF2CC", font: { bold: true } };

const scheduleDates = [
  "5/25","5/26","5/27","5/28","5/29","5/30","5/31",
  "6/1","6/2","6/3","6/4","6/5","6/6","6/7","6/8","6/9","6/10","6/11",
];
function evenSchedule(total, days) {
  const base = Math.floor(total / days);
  const extra = total % days;
  return Array.from({ length: days }, (_, i) => base + (i < extra ? 1 : 0));
}
function rampSchedule(total, days) {
  const raw = Array.from({ length: days }, () => 1);
  raw[days - 1] = 2;
  let diff = total - raw.reduce((a, b) => a + b, 0);
  for (let i = days - 2; diff > 0; i = i <= 0 ? days - 2 : i - 1, diff--) {
    raw[i]++;
  }
  return raw;
}
const scheduleByMember = Object.fromEntries(allocation.map(x => [
  x.name,
  x.type === "ベンチ" ? rampSchedule(x.add, scheduleDates.length) : evenSchedule(x.add, scheduleDates.length),
]));
const scheduleRows = scheduleDates.map((date, i) => {
  const vals = members.map(name => scheduleByMember[name][i]);
  return [date, ...vals, vals.reduce((a, b) => a + b, 0)];
});
s.getRange("A19:M19").merge();
s.getRange("A19").values = [["5/25以降 日別追加アポ計画（通常メンバーは均し、ベンチは徐々に増加）"]];
s.getRange("A19").format = { fill: "#0B3F66", font: { color: "#FFFFFF", bold: true }, horizontalAlignment: "center" };
table(s, { r: 20, c: 0 }, ["日付", ...members, "日計"], scheduleRows);
s.getRange("A39:M39").values = [["合計", ...members.map(name => scheduleByMember[name].reduce((a,b)=>a+b,0)), totalAdd]];
s.getRange("A39:M39").format = { fill: "#FFF2CC", font: { bold: true } };

s = ws("確認事項");
title(s, "確認事項", "C");
setWidths(s, [300,520,180]);
table(s, { r: 2, c: 0 }, ["確認項目","内容","優先度"], [
  ["残アポ96件と元データ集計の差分","期間全データは96件だが、週別データから集計すると91件。今回の目標計算は前提96件で固定。","高"],
  ["追加必要アポ数","計算上は355-96=259件。実務メモに合わせて割り振り案は264件で作成。","高"],
  ["成約率35%の定義","本資料では追加アポ逆算用の想定成約率として使用。メンバー評価では成約数÷着座数、成約数÷アポ数を併記。","高"],
  ["失注数の定義","元データに明示列がないため、着座数-成約数-成約予定数-保留数で仮算出。","中"],
  ["ベンチ表記ゆれ","もちきれな=持木玲那、まちこ=河上まちこ として扱い。五十嵐凌大は依頼文の表記を採用。","中"],
  ["6/11着金可否","契約日、決済日、ローンチ分の着金リードタイムが必要。","高"],
  ["ベンチ再デビュー条件","5/25からアポ入り前提。ロープレ回数、最終確認者、許可日を別途確定。","高"],
]);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({ sheetName: "全体サマリー", range: "A1:F17", scale: 1, format: "png" });
await fs.writeFile("C:/Users/celic/dormswap/outputs/image_excel/preview_analysis_summary.png", new Uint8Array(await preview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
