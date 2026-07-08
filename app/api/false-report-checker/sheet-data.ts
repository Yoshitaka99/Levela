import type {
  CustomerRow,
  FalseReportData,
  FalseReportRow,
  ProblemOkRow,
  ReplyRow,
} from "../../false-report-checker/types";

export const LIGHTWEIGHT_SPREADSHEET_ID =
  process.env.FALSE_REPORT_SPREADSHEET_ID ?? "1npumMCuzudexL9ZE4jr8tTMRh9j23eKXOatAqQ71uiY";

export const LIGHTWEIGHT_SHEETS_URL = `https://docs.google.com/spreadsheets/d/${LIGHTWEIGHT_SPREADSHEET_ID}/edit`;

const TAB_CUSTOMERS = "顧客管理_自動反映";
const TAB_FALSE_REPORTS = "虚偽報告集計";
const TAB_PROBLEM_OK = "問題無し";
const TAB_REPLIES = "返信あり顧客リスト";

type CsvFetchResult = {
  rows: string[][];
  warning?: string;
};

function parseBoolean(value: string) {
  return value.trim().toUpperCase() === "TRUE";
}

function getCell(row: string[], index: number) {
  return row[index]?.trim() ?? "";
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

async function fetchCsv(sheetName: string, range: string, required = true): Promise<CsvFetchResult> {
  const params = new URLSearchParams({
    tqx: "out:csv",
    sheet: sheetName,
    range,
  });
  const url = `https://docs.google.com/spreadsheets/d/${LIGHTWEIGHT_SPREADSHEET_ID}/gviz/tq?${params.toString()}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "text/csv,*/*",
    },
  });

  if (!response.ok) {
    return {
      rows: [],
      warning: required ? `${sheetName} をCSVで読めませんでした: HTTP ${response.status}` : undefined,
    };
  }

  const text = await response.text();
  if (text.includes("<!DOCTYPE html") || text.includes("ServiceLogin")) {
    return {
      rows: [],
      warning: required ? `${sheetName} は公開CSVとして読めません。Apps Script連携が必要です。` : undefined,
    };
  }

  return { rows: parseCsv(text) };
}

function mapCustomerRows(rows: string[][]): CustomerRow[] {
  return rows.slice(1).flatMap((row, index) => {
    const customerName = getCell(row, 2);
    if (!customerName) return [];

    const confirmedSeatStatus = getCell(row, 31);
    const confirmedSecondStatus = getCell(row, 32);
    const currentSeatStatus = getCell(row, 8);
    const currentSecondStatus = getCell(row, 9);
    const changed =
      parseBoolean(getCell(row, 33)) ||
      (!!confirmedSeatStatus && confirmedSeatStatus !== currentSeatStatus) ||
      (!!confirmedSecondStatus && confirmedSecondStatus !== currentSecondStatus);

    return [
      {
        rowNumber: index + 3,
        confirmed: parseBoolean(getCell(row, 0)),
        diffReviewed: parseBoolean(getCell(row, 1)),
        customerName,
        ownerName: getCell(row, 3),
        seminar: getCell(row, 4),
        applicationDate: getCell(row, 5),
        meetingDate: getCell(row, 6),
        source: getCell(row, 7),
        seatStatus: currentSeatStatus,
        secondStatus: currentSecondStatus,
        confirmedSeatStatus,
        confirmedSecondStatus,
        currentSeatStatus,
        currentSecondStatus,
        changed,
        rowKey: getCell(row, 34) || `${customerName}_${getCell(row, 3)}_${getCell(row, 4)}`,
      },
    ];
  });
}

function mapFalseReportRows(rows: string[][]): FalseReportRow[] {
  return rows.slice(1).flatMap((row, index) => {
    const customerName = getCell(row, 5);
    const falseReport = getCell(row, 0);
    const correctReport = getCell(row, 1);
    const detectedAt = getCell(row, 2);
    if (!customerName && !falseReport && !correctReport && !detectedAt) return [];

    return [
      {
        rowNumber: index + 2,
        falseReport,
        correctReport,
        detectedAt,
        confirmedAt: getCell(row, 3),
        memo: getCell(row, 4),
        customerName,
        ownerName: getCell(row, 6),
        seminar: getCell(row, 7),
        seatStatus: getCell(row, 8),
        secondStatus: getCell(row, 9),
      },
    ];
  });
}

function mapProblemOkRows(rows: string[][]): ProblemOkRow[] {
  const header = rows[0] ?? [];
  if (getCell(header, 0) !== "確認時報告" || getCell(header, 3) !== "対応者") {
    return [];
  }

  return rows.slice(1).flatMap((row, index) => {
    const customerName = getCell(row, 5);
    const falseReport = getCell(row, 0);
    const correctReport = getCell(row, 1);
    const reflectedAt = getCell(row, 2);
    if (!customerName && !falseReport && !correctReport && !reflectedAt) return [];

    return [
      {
        rowNumber: index + 2,
        falseReport,
        correctReport,
        reflectedAt,
        handler: getCell(row, 3),
        memo: getCell(row, 4),
        customerName,
        ownerName: getCell(row, 6),
        seminar: getCell(row, 7),
        seatStatus: getCell(row, 8),
        secondStatus: getCell(row, 9),
        sourceRowNumber: getCell(row, 10),
      },
    ];
  });
}

function mapReplyRows(rows: string[][]): ReplyRow[] {
  return rows.slice(1).flatMap((row, index) => {
    const customerName = getCell(row, 0);
    if (!customerName) return [];

    return [
      {
        rowNumber: index + 2,
        customerName,
        ownerName: getCell(row, 1),
        seminar: getCell(row, 2),
        replyAt: getCell(row, 3),
        memo: getCell(row, 4),
        messageDone: parseBoolean(getCell(row, 5)),
        contacted: parseBoolean(getCell(row, 6)),
        seatStatus: getCell(row, 7),
        contractStatus: getCell(row, 8),
        contactMemo: getCell(row, 9),
      },
    ];
  });
}

export async function fetchFromPublicCsv(): Promise<FalseReportData> {
  const [customersResult, falseReportsResult, problemOkResult, repliesResult] = await Promise.all([
    fetchCsv(TAB_CUSTOMERS, "A2:AJ5000"),
    fetchCsv(TAB_FALSE_REPORTS, "A1:AD3000"),
    fetchCsv(TAB_PROBLEM_OK, "A1:K3000", false),
    fetchCsv(TAB_REPLIES, "A1:J2000"),
  ]);

  const customers = mapCustomerRows(customersResult.rows);
  const falseReports = mapFalseReportRows(falseReportsResult.rows);
  const problemOk = mapProblemOkRows(problemOkResult.rows);
  const replies = mapReplyRows(repliesResult.rows);
  const warnings = [
    customersResult.warning,
    falseReportsResult.warning,
    problemOkResult.warning,
    repliesResult.warning,
  ].filter(Boolean);
  const changedCustomers = customers.filter((row) => row.changed).length;

  return {
    updatedAt: new Date().toISOString(),
    writeReady: Boolean(process.env.FALSE_REPORT_WEBHOOK_URL),
    source: "public-csv",
    sheetsUrl: LIGHTWEIGHT_SHEETS_URL,
    customers,
    falseReports,
    problemOk,
    replies,
    stats: {
      totalCustomers: customers.length,
      confirmedCustomers: customers.filter((row) => row.confirmed).length,
      changedCustomers,
      unreviewedChanges: customers.filter((row) => row.changed && !row.diffReviewed).length,
      falseReports: falseReports.length,
      problemOk: problemOk.length,
      replies: replies.length,
    },
    warning: warnings.length ? warnings.join(" / ") : undefined,
  };
}
