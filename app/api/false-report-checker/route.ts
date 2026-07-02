import { NextResponse } from "next/server";
import type {
  CustomerRow,
  FalseReportCheckerData,
  FalseReportRow,
  ReplyRow,
} from "../../false-report-checker/types";

export const dynamic = "force-dynamic";

// 軽量版シート。大元の顧客管理シート (1kkL_...) は読み書きとも扱わない。
const LIGHT_SPREADSHEET_ID = "1npumMCuzudexL9ZE4jr8tTMRh9j23eKXOatAqQ71uiY";

const CUSTOMERS_GID = "988340691"; // 顧客管理_自動反映
const FALSE_REPORTS_GID = "259179250"; // 虚偽報告集計
const REPLIES_GID = "1055902312"; // 返信あり顧客リスト

const ALLOWED_ACTIONS = new Set([
  "getData",
  "setConfirmed",
  "setDiffConfirmed",
  "saveFalseReportMemo",
  "updateReply",
]);

function csvUrl(gid: string) {
  return `https://docs.google.com/spreadsheets/d/${LIGHT_SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

const SHEET_SERIAL_EPOCH_MS = Date.UTC(1899, 11, 30);

function formatSheetValue(raw: string) {
  const value = raw.trim();
  if (!/^\d{4,6}(\.\d+)?$/.test(value)) return value;

  const serial = Number(value);
  const date = new Date(SHEET_SERIAL_EPOCH_MS + serial * 86_400_000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  if (serial % 1 === 0) return `${y}/${m}/${d}`;

  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

function toBool(value: string | undefined) {
  return (value ?? "").trim().toUpperCase() === "TRUE";
}

function cellAt(row: string[], index: number) {
  return (row[index] ?? "").trim();
}

async function fetchCsv(gid: string) {
  const response = await fetch(csvUrl(gid), { cache: "no-store", redirect: "follow" });
  if (!response.ok) {
    throw new Error(`CSV取得に失敗しました (gid=${gid}, status=${response.status})`);
  }
  return parseCsv(await response.text());
}

function mapCustomers(rows: string[][]): CustomerRow[] {
  // 1行目はバナー、2行目がヘッダー
  return rows
    .slice(2)
    .filter((row) => cellAt(row, 2))
    .map((row) => ({
      rowKey: cellAt(row, 34),
      confirmed: toBool(row[0]),
      diffConfirmed: toBool(row[1]),
      customerName: cellAt(row, 2),
      staffName: cellAt(row, 3),
      seminar: cellAt(row, 4),
      appliedAt: formatSheetValue(cellAt(row, 5)),
      interviewAt: formatSheetValue(cellAt(row, 6)),
      inflow: cellAt(row, 7),
      seated: cellAt(row, 8),
      status: cellAt(row, 9),
      plan: cellAt(row, 16),
      confirmedStatus: cellAt(row, 31),
      currentStatus: cellAt(row, 32),
      changeDetected: toBool(row[33]),
    }));
}

function mapFalseReports(rows: string[][]): FalseReportRow[] {
  return rows
    .slice(1)
    .map((row, index) => ({ row, sheetRow: index + 2 }))
    .filter(({ row }) => cellAt(row, 5) || cellAt(row, 0))
    .map(({ row, sheetRow }) => ({
      rowIndex: sheetRow,
      rowKey: cellAt(row, 32),
      managementId: cellAt(row, 28),
      falseReport: cellAt(row, 0),
      correctReport: cellAt(row, 1),
      confirmedAt: formatSheetValue(cellAt(row, 2)),
      detectedAt: formatSheetValue(cellAt(row, 3)),
      memo: cellAt(row, 4),
      customerName: cellAt(row, 5),
      staffName: cellAt(row, 6),
      seminar: cellAt(row, 7),
      appliedAt: formatSheetValue(cellAt(row, 8)),
      interviewAt: formatSheetValue(cellAt(row, 9)),
      seated: cellAt(row, 11),
      status: cellAt(row, 12),
    }));
}

function mapReplies(rows: string[][]): ReplyRow[] {
  return rows
    .slice(1)
    .map((row, index) => ({ row, sheetRow: index + 2 }))
    .filter(({ row }) => cellAt(row, 3))
    .map(({ row, sheetRow }) => ({
      rowIndex: sheetRow,
      appliedAt: formatSheetValue(cellAt(row, 0)),
      appliedAtRaw: cellAt(row, 0),
      interviewDate: formatSheetValue(cellAt(row, 1)),
      slot: cellAt(row, 2),
      customerName: cellAt(row, 3),
      salesman: cellAt(row, 4),
      hasMessage: toBool(row[5]),
      contacted: toBool(row[6]),
      status: cellAt(row, 7),
      contractStatus: cellAt(row, 8),
      memo: cellAt(row, 9),
    }));
}

function isWriteEnabled() {
  return Boolean(process.env.FALSE_REPORT_WEBHOOK_URL && process.env.FALSE_REPORT_WEBHOOK_SECRET);
}

export async function GET() {
  try {
    const [customerRows, falseReportRows, replyRows] = await Promise.all([
      fetchCsv(CUSTOMERS_GID),
      fetchCsv(FALSE_REPORTS_GID),
      fetchCsv(REPLIES_GID),
    ]);

    const data: FalseReportCheckerData = {
      updatedAt: new Date().toISOString(),
      writeEnabled: isWriteEnabled(),
      customers: mapCustomers(customerRows),
      falseReports: mapFalseReports(falseReportRows),
      replies: mapReplies(replyRows),
    };

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "データ取得に失敗しました" },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const webhookUrl = process.env.FALSE_REPORT_WEBHOOK_URL;
  const webhookSecret = process.env.FALSE_REPORT_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "書き込みは未設定です。FALSE_REPORT_WEBHOOK_URL / FALSE_REPORT_WEBHOOK_SECRET を設定してください。",
      },
      { status: 501 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ ok: false, error: `unknown action: ${action}` }, { status: 400 });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, action, secret: webhookSecret }),
      redirect: "follow",
      cache: "no-store",
    });

    const text = await response.text();
    try {
      const payload = JSON.parse(text);
      return NextResponse.json(payload, { status: payload.ok === false ? 400 : 200 });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: `Apps Script がJSONを返しませんでした (status=${response.status})。Webアプリのアクセス設定(全員)と初回承認を確認してください。`,
        },
        { status: 502 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "書き込み中継に失敗しました" },
      { status: 502 },
    );
  }
}
