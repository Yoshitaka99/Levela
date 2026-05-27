import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/celic/dormswap/outputs/image_excel";
const outputPath = `${outputDir}/dormswap_image_data.xlsx`;

const members = [
  "チーム合計",
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

const metricGroups = [
  { label: "着地成約数", width: 2 },
  { label: "アポ数", width: 1 },
  { label: "消化アポ", width: 1 },
  { label: "残アポ", width: 1 },
  { label: "着席", width: 2 },
  { label: "成約", width: 2 },
  { label: "成約予定", width: 2 },
  { label: "予定→成約", width: 2 },
  { label: "保留", width: 2 },
  { label: "保留→成約", width: 2 },
];

const subHeaders = ["数", "率", "数", "数", "数", "数", "率", "数", "率", "数", "率", "数", "率", "数", "率", "数", "率"];

const zeros = ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"];

const weeks = [
  {
    name: "1週目",
    title: "1週目 （5月9日〜5月15日）",
    rows: [
      ["22", "22.8%", "149", "132", "17", "96", "72.7%", "19", "19.8%", "7", "7.3%", "9", "56.3%", "18", "18.8%", "2", "10.0%"],
      ["3", "18.8%", "30", "24", "6", "16", "66.7%", "3", "18.8%", "0", "0.0%", "1", "100.0%", "5", "31.3%", "0", "0.0%"],
      ["6", "35.9%", "28", "26", "2", "16", "61.5%", "5", "31.3%", "1", "6.3%", "3", "75.0%", "2", "12.5%", "1", "33.3%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["2", "22.2%", "13", "10", "3", "9", "90.0%", "2", "22.2%", "0", "0.0%", "0", "0%", "0", "0.0%", "0", "0%"],
      ["0", "0.0%", "2", "2", "0", "2", "100.0%", "0", "0.0%", "0", "0.0%", "0", "0%", "1", "50.0%", "0", "0.0%"],
      ["1", "6.7%", "21", "20", "1", "15", "75.0%", "1", "6.7%", "0", "0.0%", "0", "0%", "2", "13.3%", "1", "33.3%"],
      ["2", "37.5%", "6", "6", "0", "4", "66.7%", "1", "25.0%", "1", "25.0%", "1", "50.0%", "0", "0.0%", "0", "0%"],
      ["3", "38.1%", "9", "9", "0", "7", "77.8%", "2", "28.6%", "1", "14.3%", "2", "66.7%", "2", "28.6%", "0", "0.0%"],
      ["0", "0.0%", "12", "10", "2", "9", "90.0%", "0", "0.0%", "2", "22.2%", "0", "0.0%", "4", "44.4%", "0", "0.0%"],
      ["6", "33.3%", "28", "25", "3", "18", "72.0%", "5", "27.8%", "2", "11.1%", "2", "50.0%", "2", "11.1%", "0", "0.0%"],
    ],
  },
  {
    name: "2週目",
    title: "2週目 （5月16日〜5月22日）",
    rows: [
      ["2", "20.0%", "70", "18", "52", "10", "55.6%", "2", "20.0%", "4", "40.0%", "0", "0.0%", "3", "30.0%", "0", "0.0%"],
      ["1", "33.3%", "15", "8", "7", "3", "37.5%", "1", "33.3%", "1", "33.3%", "0", "0.0%", "1", "33.3%", "0", "0.0%"],
      ["0", "0.0%", "21", "4", "17", "4", "100.0%", "0", "0.0%", "2", "50.0%", "0", "0.0%", "1", "25.0%", "0", "0.0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "12", "2", "10", "0", "0.0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "3", "0", "3", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "4", "1", "3", "0", "0.0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["1", "33.3%", "15", "3", "12", "3", "100.0%", "1", "33.3%", "1", "33.3%", "0", "0.0%", "1", "33.3%", "0", "0.0%"],
      ["1", "50.0%", "11", "3", "8", "2", "66.7%", "1", "50.0%", "1", "50.0%", "0", "0.0%", "0", "0.0%", "0", "0%"],
      ["0", "0.0%", "25", "3", "22", "2", "66.7%", "0", "0.0%", "1", "50.0%", "0", "0.0%", "1", "50.0%", "0", "0.0%"],
    ],
  },
  {
    name: "3週目",
    title: "3週目 （5月23日〜5月29日）",
    rows: [
      ["0", "0%", "21", "0", "21", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "10", "0", "10", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "1", "0", "1", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "4", "0", "4", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "6", "0", "6", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "10", "0", "10", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
    ],
  },
  { name: "4週目", title: "4週目 （5月30日〜6月5日）", rows: members.map(() => [...zeros]) },
  {
    name: "5週目",
    title: "5週目 （6月6日〜6月12日）",
    rows: [
      ["0", "0%", "1", "0", "1", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0%"],
      ["0", "0%", "1", "0", "1", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0%"],
      ["0", "0%", "0", "0", "0", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0", "0%", "0%"],
    ],
  },
];

const summaryRows = [
  ["チーム目標値", "147件", "red"],
  ["成約数", "17件", "red"],
  ["成約予定数", "13件", "red"],
  ["合計", "30件", "red"],
  ["進捗", "20.4%", "redValue"],
  ["アポ消化数", "128件", "blue"],
  ["着席", "90件", "blue"],
  ["着席率", "70.3%", "blue"],
  ["残アポ", "96件", "blue"],
  ["成約率", "18.9%", "greenValue"],
  ["成約率（予定込）", "33.3%", "greenValue"],
  ["着地本数", "49件", "strongRed"],
  ["着地進捗", "33.1%", "strongRedValue"],
];

const workbook = Workbook.create();

function styleCommon(sheet) {
  sheet.showGridLines = true;
  sheet.getRange("A:R").format = { font: { name: "Arial", size: 16 } };
  sheet.getRange("A:A").format.columnWidthPx = 230;
  for (let c = 1; c < 18; c++) {
    sheet.getRangeByIndexes(0, c, 1, 1).format.columnWidthPx = 96;
  }
}

function borderAll(range) {
  range.format = {
    borders: {
      top: { style: "continuous", color: "#000000" },
      bottom: { style: "continuous", color: "#000000" },
      left: { style: "continuous", color: "#000000" },
      right: { style: "continuous", color: "#000000" },
      insideHorizontal: { style: "continuous", color: "#000000" },
      insideVertical: { style: "continuous", color: "#000000" },
    },
  };
}

function makeWeekSheet(w) {
  const sheet = workbook.worksheets.add(w.name);
  styleCommon(sheet);
  sheet.getRange("A1:R1").merge();
  sheet.getRange("A1").values = [[w.title]];
  sheet.getRange("A1").format = {
    fill: "#0B3F66",
    font: { color: "#FFFFFF", bold: true, size: 18 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  sheet.getRange("A1:R1").format.rowHeightPx = 42;

  let col = 1;
  for (const group of metricGroups) {
    const start = col;
    const end = col + group.width - 1;
    if (group.width > 1) sheet.getRangeByIndexes(1, start, 1, group.width).merge();
    sheet.getRangeByIndexes(1, start, 1, group.width).values = [[group.label, ...Array(group.width - 1).fill(null)]];
    col = end + 1;
  }
  sheet.getRange("A2:A3").merge();
  sheet.getRange("A2").values = [["メンバー"]];
  sheet.getRange("B3:R3").values = [subHeaders];
  sheet.getRange("B2:R2").format = {
    fill: "#C8D9F3",
    font: { bold: true, size: 15 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  sheet.getRange("B3:R3").format = {
    fill: "#FFE9A3",
    font: { size: 14 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  sheet.getRange("A2:A3").format = {
    fill: "#FFFFFF",
    font: { size: 15 },
    horizontalAlignment: "left",
    verticalAlignment: "bottom",
  };
  sheet.getRange("A4:A15").values = members.map((m) => [m]);
  sheet.getRange("B4:R15").values = w.rows;
  sheet.getRange("A4:R4").format = { font: { bold: true, color: "#FF0000", size: 18 } };
  sheet.getRange("A4:R15").format = { verticalAlignment: "center" };
  sheet.getRange("B4:R15").format = { horizontalAlignment: "right", font: { size: 16 } };
  sheet.getRange("A5:A15").format = { horizontalAlignment: "left", font: { size: 16 } };
  borderAll(sheet.getRange("A1:R15"));
  sheet.getRange("A2:R15").format.rowHeightPx = 42;
  sheet.freezePanes.freezeRows(3);
  return sheet;
}

for (const w of weeks) makeWeekSheet(w);

const summary = workbook.worksheets.add("期間全データ");
summary.showGridLines = false;
summary.getRange("A:B").format = { font: { name: "Arial", size: 18, bold: true } };
summary.getRange("A:A").format.columnWidthPx = 228;
summary.getRange("B:B").format.columnWidthPx = 190;
summary.getRange("A1:B1").merge();
summary.getRange("A1").values = [["期間全データ"]];
summary.getRange("A1").format = {
  fill: "#0B3F66",
  font: { color: "#FFFFFF", bold: true, size: 20 },
  horizontalAlignment: "center",
};
summary.getRange("A2:B14").values = summaryRows.map(([label, value]) => [label, value]);
summary.getRange("A2:A6").format = { fill: "#E26161", horizontalAlignment: "center" };
summary.getRange("B2:B6").format = { fill: "#F4CCCC", horizontalAlignment: "center", font: { size: 18 } };
summary.getRange("A7:A10").format = { fill: "#6D9EEB", horizontalAlignment: "center" };
summary.getRange("B7:B10").format = { fill: "#A9CCE7", horizontalAlignment: "center", font: { size: 18 } };
summary.getRange("A11:A12").format = { fill: "#A8D08D", horizontalAlignment: "center" };
summary.getRange("B11:B12").format = { fill: "#B6D7A8", horizontalAlignment: "center", font: { color: "#FF0000", size: 18 } };
summary.getRange("A13:A14").format = { fill: "#FF0000", horizontalAlignment: "center", font: { color: "#FFFFFF", bold: true, size: 18 } };
summary.getRange("B13").format = { fill: "#FFFFFF", horizontalAlignment: "center", font: { size: 18 } };
summary.getRange("B14").format = { fill: "#FFFFFF", horizontalAlignment: "center", font: { color: "#FF0000", size: 18 } };
summary.getRange("B6").format = { fill: "#F4CCCC", horizontalAlignment: "center", font: { color: "#FF0000", size: 18 } };
summary.getRange("A1:B14").format.rowHeightPx = 42;
borderAll(summary.getRange("A1:B14"));

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({ sheetName: "1週目", range: "A1:R15", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/preview_1week.png`, new Uint8Array(await preview.arrayBuffer()));
const summaryPreview = await workbook.render({ sheetName: "期間全データ", range: "A1:B14", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/preview_summary.png`, new Uint8Array(await summaryPreview.arrayBuffer()));

const check = await workbook.inspect({
  kind: "table",
  range: "1週目!A1:R15",
  include: "values",
  tableMaxRows: 16,
  tableMaxCols: 18,
  maxChars: 6000,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
