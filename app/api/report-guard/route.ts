import { NextResponse } from "next/server";
import type {
  CustomerRow,
  FalseReportRow,
  GuardAlert,
  ReportGuardData,
  TriageState,
} from "../../report-guard/types";

export const dynamic = "force-dynamic";

// /false-report-checker と同じデータソースを使う比較検証用の別実装。
// 軽量版シート (書き込み先) と大元シート (読み取り専用) の扱いも同一。
const LIGHT_SPREADSHEET_ID = "1npumMCuzudexL9ZE4jr8tTMRh9j23eKXOatAqQ71uiY";
const MASTER_SPREADSHEET_ID = "1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s";
const MASTER_SHEET_GID = "2051214579";
const MASTER_STATUS_QUERY = "select A,G,H,X where X is not null";

const CUSTOMERS_GID = "988340691"; // 顧客管理_自動反映
const FALSE_REPORTS_GID = "259179250"; // 虚偽報告集計
const CONFIRMED_TAB_GID = "810691914"; // 確認済み
const CHECK_MANAGEMENT_SHEET_NAME = "チェック管理";
const CONFIRM_CHECKS_SHEET_NAME = "確認チェック";
// トリアージ(問題なし/要調査/虚偽確定)は返信チェックタブに TRIAGE| プレフィックスで保存する
const REPLY_CHECKS_SHEET_NAME = "返信チェック";
const TRIAGE_KEY_PREFIX = "TRIAGE";

const TRIAGE_STATES = new Set(["ok", "investigating", "confirmed_false", ""]);

function csvUrl(gid: string) {
  return `https://docs.google.com/spreadsheets/d/${LIGHT_SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}

function lightSheetByNameUrl(sheetName: string) {
  return `https://docs.google.com/spreadsheets/d/${LIGHT_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&headers=0`;
}

function masterStatusUrl() {
  return `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${MASTER_SHEET_GID}&tq=${encodeURIComponent(MASTER_STATUS_QUERY)}`;
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

function parseDateKey(text: string) {
  const match = text.match(/(\d{4})[年/](\d{1,2})[月/](\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function toBool(value: string | undefined) {
  return (value ?? "").trim().toUpperCase() === "TRUE";
}

function cellAt(row: string[], index: number) {
  return (row[index] ?? "").trim();
}

function combineStatus(seated: string, status: string) {
  return status ? `${seated} / ${status}` : seated;
}

async function fetchCsv(gid: string) {
  const response = await fetch(csvUrl(gid), { cache: "no-store", redirect: "follow" });
  if (!response.ok) {
    throw new Error(`CSV取得に失敗しました (gid=${gid}, status=${response.status})`);
  }
  return parseCsv(await response.text());
}

async function fetchCsvOptional(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "follow" });
    if (!response.ok) return [] as string[][];
    return parseCsv(await response.text());
  } catch {
    return [] as string[][];
  }
}

function mapMasterStatuses(rows: string[][]) {
  const statuses = new Map<string, string[]>();
  for (const row of rows.slice(1)) {
    const id = cellAt(row, 3);
    if (!id) continue;
    const combined = combineStatus(cellAt(row, 1), cellAt(row, 2));
    const list = statuses.get(id) ?? [];
    if (!list.includes(combined)) list.push(combined);
    statuses.set(id, list);
  }
  return statuses;
}

type Snapshot = { status: string; at: string };

function mapSnapshots(
  checkManagementRows: string[][],
  confirmedTabRows: string[][],
  confirmCheckRows: string[][],
) {
  const snapshots = new Map<string, Snapshot>();
  const setIfAbsent = (key: string, status: string, at: string) => {
    if (key && status && !snapshots.has(key)) snapshots.set(key, { status, at });
  };

  if (cellAt(checkManagementRows[0] ?? [], 0) === "key") {
    for (const row of checkManagementRows.slice(1)) {
      setIfAbsent(cellAt(row, 0), cellAt(row, 7), formatSheetValue(cellAt(row, 8)));
    }
  }
  for (const row of confirmedTabRows.slice(1)) {
    const id = cellAt(row, 23);
    if (!id) continue;
    const status = cellAt(row, 29) || combineStatus(cellAt(row, 6), cellAt(row, 7));
    setIfAbsent(`M:${id}`, status, formatSheetValue(cellAt(row, 28)));
  }
  if (cellAt(confirmCheckRows[0] ?? [], 0) === "行キー") {
    for (const row of confirmCheckRows.slice(1)) {
      setIfAbsent(cellAt(row, 0), cellAt(row, 3), formatSheetValue(cellAt(row, 4)));
    }
  }
  return snapshots;
}

type Triage = { state: TriageState; memo: string };

function mapTriage(rows: string[][]) {
  const triage = new Map<string, Triage>();
  if (cellAt(rows[0] ?? [], 0) !== "キー") return triage;
  for (const row of rows.slice(1)) {
    const key = cellAt(row, 0);
    if (!key.startsWith(`${TRIAGE_KEY_PREFIX}|`)) continue;
    const rowKey = key.slice(TRIAGE_KEY_PREFIX.length + 1).replace(/\|$/, "");
    const state = cellAt(row, 4) as TriageState;
    triage.set(rowKey, {
      state: TRIAGE_STATES.has(state) ? state : "",
      memo: cellAt(row, 6),
    });
  }
  return triage;
}

function mapCustomers(
  rows: string[][],
  masterStatuses: Map<string, string[]>,
  snapshots: Map<string, Snapshot>,
) {
  return rows
    .map((row, index) => ({ row, sheetRow: index + 1 }))
    .slice(2)
    .filter(({ row }) => cellAt(row, 2))
    .map(({ row, sheetRow }) => {
      const rowKey = cellAt(row, 34);
      const managementId = cellAt(row, 25);
      const confirmed = toBool(row[0]);
      const diffConfirmed = toBool(row[1]);
      const lightCurrent = cellAt(row, 32) || combineStatus(cellAt(row, 8), cellAt(row, 9));
      const masterList = managementId ? masterStatuses.get(managementId) : undefined;
      const snapshot =
        snapshots.get(rowKey) ?? (managementId ? snapshots.get(`M:${managementId}`) : undefined);
      const confirmedStatus = snapshot?.status || cellAt(row, 31);

      const statusChanged = masterList
        ? !masterList.includes(confirmedStatus)
        : Boolean(lightCurrent) && lightCurrent !== confirmedStatus;
      const changeDetected =
        (confirmed && Boolean(confirmedStatus) && statusChanged) || toBool(row[33]);

      const customer: CustomerRow = {
        rowIndex: sheetRow,
        rowKey,
        confirmed,
        diffConfirmed,
        customerName: cellAt(row, 2),
        staffName: cellAt(row, 3),
        seminar: cellAt(row, 4),
        appliedAt: formatSheetValue(cellAt(row, 5)),
        interviewAt: formatSheetValue(cellAt(row, 6)),
        interviewDate: parseDateKey(formatSheetValue(cellAt(row, 6))),
        seated: cellAt(row, 8),
        status: cellAt(row, 9),
        plan: cellAt(row, 16),
        confirmedStatus: changeDetected || diffConfirmed ? confirmedStatus : "",
        currentStatus:
          changeDetected || diffConfirmed
            ? masterList
              ? masterList.join(" | ")
              : lightCurrent
            : "",
        changeDetected,
      };
      return { customer, confirmedAt: snapshot?.at ?? "" };
    });
}

function buildAlerts(
  mapped: { customer: CustomerRow; confirmedAt: string }[],
  triage: Map<string, Triage>,
): GuardAlert[] {
  return mapped
    .filter(({ customer }) => customer.changeDetected || customer.diffConfirmed)
    .map(({ customer, confirmedAt }) => {
      const state = triage.get(customer.rowKey);
      return {
        id: `${customer.rowKey}#${customer.rowIndex}`,
        rowKey: customer.rowKey,
        rowIndex: customer.rowIndex,
        customerName: customer.customerName,
        staffName: customer.staffName,
        seminar: customer.seminar,
        interviewAt: customer.interviewAt,
        interviewDate: customer.interviewDate,
        kind: customer.changeDetected ? ("auto" as const) : ("manual" as const),
        beforeStatus: customer.confirmedStatus,
        afterStatus: customer.currentStatus,
        confirmedAt,
        triage: state?.state ?? "",
        triageMemo: state?.memo ?? "",
      };
    });
}

function mapFalseReports(
  rows: string[][],
  masterStatuses: Map<string, string[]>,
  snapshots: Map<string, Snapshot>,
): FalseReportRow[] {
  return rows
    .slice(1)
    .map((row, index) => ({ row, sheetRow: index + 2 }))
    .filter(({ row }) => cellAt(row, 5) || cellAt(row, 0))
    .map(({ row, sheetRow }) => {
      const rowKey = cellAt(row, 32);
      const managementId = cellAt(row, 28);
      const falseReport = cellAt(row, 0);
      const legacy = falseReport.includes("旧まとめシート");
      const snapshot = legacy
        ? undefined
        : snapshots.get(rowKey) ?? (managementId ? snapshots.get(`M:${managementId}`) : undefined);
      const masterList = managementId ? masterStatuses.get(managementId) : undefined;
      return {
        rowIndex: sheetRow,
        rowKey,
        managementId,
        legacy,
        falseReport,
        correctReport: cellAt(row, 1),
        confirmedStatus: snapshot?.status ?? "",
        currentStatus: masterList
          ? masterList.join(" | ")
          : combineStatus(cellAt(row, 11), cellAt(row, 12)),
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
      };
    });
}

function isWriteEnabled() {
  return Boolean(process.env.FALSE_REPORT_WEBHOOK_URL && process.env.FALSE_REPORT_WEBHOOK_SECRET);
}

const DATA_CACHE_TTL_MS = 30_000;
let dataCache: { data: ReportGuardData; expiresAt: number } | null = null;

export async function GET() {
  if (dataCache && Date.now() < dataCache.expiresAt) {
    return NextResponse.json(dataCache.data);
  }
  try {
    const [
      customerRows,
      falseReportRows,
      confirmedTabRows,
      checkManagementRows,
      confirmCheckRows,
      masterRows,
      replyCheckRows,
    ] = await Promise.all([
      fetchCsv(CUSTOMERS_GID),
      fetchCsv(FALSE_REPORTS_GID),
      fetchCsvOptional(csvUrl(CONFIRMED_TAB_GID)),
      fetchCsvOptional(lightSheetByNameUrl(CHECK_MANAGEMENT_SHEET_NAME)),
      fetchCsvOptional(lightSheetByNameUrl(CONFIRM_CHECKS_SHEET_NAME)),
      fetchCsvOptional(masterStatusUrl()),
      fetchCsvOptional(lightSheetByNameUrl(REPLY_CHECKS_SHEET_NAME)),
    ]);

    const masterStatuses = mapMasterStatuses(masterRows);
    const snapshots = mapSnapshots(checkManagementRows, confirmedTabRows, confirmCheckRows);
    const triage = mapTriage(replyCheckRows);
    const mapped = mapCustomers(customerRows, masterStatuses, snapshots);

    const data: ReportGuardData = {
      updatedAt: new Date().toISOString(),
      writeEnabled: isWriteEnabled(),
      alerts: buildAlerts(mapped, triage),
      customers: mapped.map(({ customer }) => customer),
      falseReports: mapFalseReports(falseReportRows, masterStatuses, snapshots),
    };

    dataCache = { data, expiresAt: Date.now() + DATA_CACHE_TTL_MS };
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "データ取得に失敗しました" },
      { status: 502 },
    );
  }
}

const ALLOWED_ACTIONS = new Set([
  "setConfirmed",
  "setDiffConfirmed",
  "saveFalseReportMemo",
  "setTriage",
]);

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

  // トリアージは既存Apps Scriptの汎用upsert (updateReply→返信チェックタブ) に載せる
  let forwarded: Record<string, unknown> = { ...body };
  if (action === "setTriage") {
    const rowKey = typeof body.rowKey === "string" ? body.rowKey : "";
    const state = typeof body.state === "string" ? body.state : "";
    if (!rowKey || !TRIAGE_STATES.has(state)) {
      return NextResponse.json({ ok: false, error: "rowKey / state が不正です" }, { status: 400 });
    }
    forwarded = {
      action: "updateReply",
      appliedAt: TRIAGE_KEY_PREFIX,
      customerName: rowKey,
      slot: "",
      status: state,
      memo: typeof body.memo === "string" ? body.memo : "",
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...forwarded, secret: webhookSecret }),
      redirect: "follow",
      cache: "no-store",
    });

    const text = await response.text();
    try {
      const payload = JSON.parse(text);
      if (payload.ok !== false) dataCache = null;
      return NextResponse.json(payload, { status: payload.ok === false ? 400 : 200 });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: `Apps Script がJSONを返しませんでした (status=${response.status})。`,
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
