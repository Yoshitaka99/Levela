import { NextResponse } from "next/server";
import type {
  CustomerRow,
  FalseReportCheckerData,
  FalseReportRow,
} from "../../false-report-checker/types";

export const dynamic = "force-dynamic";

// 軽量版シート (チェックやメモの書き込み先)
const LIGHT_SPREADSHEET_ID = "1npumMCuzudexL9ZE4jr8tTMRh9j23eKXOatAqQ71uiY";

// 大元の顧客管理シート。現在ステータスの照合のための「読み取り専用」。
// 絶対に書き込まないこと (書き込みは全て軽量版シートのみ)。
const MASTER_SPREADSHEET_ID = "1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s";
const MASTER_SHEET_GID = "2051214579";
// A=お客様名, G=着席, H=2回目/実施後ステータス, X=管理ID
const MASTER_STATUS_QUERY = "select A,G,H,X where X is not null";

const CUSTOMERS_GID = "988340691"; // 顧客管理_自動反映
const FALSE_REPORTS_GID = "259179250"; // 虚偽報告集計
const CONFIRMED_TAB_GID = "810691914"; // 確認済み (シート側スナップショット)

// シート側自動処理の永続ストア (隠しタブ)。status at confirmation を持つ
const CHECK_MANAGEMENT_SHEET_NAME = "チェック管理";
// Web Appが確認済みチェック時に記録するスナップショットタブ
const CONFIRM_CHECKS_SHEET_NAME = "確認チェック";

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

// 補助データ (スナップショット/大元照合) は取得失敗しても本体表示を止めない
async function fetchCsvOptional(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "follow" });
    if (!response.ok) return [] as string[][];
    return parseCsv(await response.text());
  } catch {
    return [] as string[][];
  }
}

function combineStatus(seated: string, status: string) {
  return status ? `${seated} / ${status}` : seated;
}

// 「2026年5月11日(月) 11:30～13:00」「2026/06/14」等から YYYY-MM-DD を取り出す
function parseDateKey(text: string) {
  const match = text.match(/(\d{4})[年/](\d{1,2})[月/](\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

/** 大元シートの 管理ID → 現在ステータス一覧 (重複予約は複数ステータスを持つ) */
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

/**
 * 確認済みチェック時点のステータスを行キー(M:管理ID等)で引けるようにする。
 * 優先順: チェック管理 (シート側の正) > 確認済みタブ > 確認チェック (Web App記録)
 */
function mapSnapshots(
  checkManagementRows: string[][],
  confirmedTabRows: string[][],
  confirmCheckRows: string[][],
) {
  const snapshots = new Map<string, string>();
  const setIfAbsent = (key: string, value: string) => {
    if (key && value && !snapshots.has(key)) snapshots.set(key, value);
  };

  // チェック管理: col0=key, col7=status at confirmation (タブ未作成時はヘッダー検証で除外)
  if (cellAt(checkManagementRows[0] ?? [], 0) === "key") {
    for (const row of checkManagementRows.slice(1)) {
      setIfAbsent(cellAt(row, 0), cellAt(row, 7));
    }
  }
  // 確認済みタブ: col23=管理ID, col29=確認済み時点のステータス。
  // col29はほぼ未記録のため、チェック時点のコピーである col6=着席/col7=ステータス から復元する
  for (const row of confirmedTabRows.slice(1)) {
    const id = cellAt(row, 23);
    if (!id) continue;
    const snapshot = cellAt(row, 29) || combineStatus(cellAt(row, 6), cellAt(row, 7));
    setIfAbsent(`M:${id}`, snapshot);
  }
  // 確認チェック: col0=行キー, col3=確認時点ステータス
  if (cellAt(confirmCheckRows[0] ?? [], 0) === "行キー") {
    for (const row of confirmCheckRows.slice(1)) {
      setIfAbsent(cellAt(row, 0), cellAt(row, 3));
    }
  }
  return snapshots;
}

function mapCustomers(
  rows: string[][],
  masterStatuses: Map<string, string[]>,
  snapshots: Map<string, string>,
): CustomerRow[] {
  // 1行目はバナー、2行目がヘッダー。シート行番号 = 配列index + 1
  return rows
    .map((row, index) => ({ row, sheetRow: index + 1 }))
    .slice(2)
    .filter(({ row }) => cellAt(row, 2))
    .map(({ row, sheetRow }) => {
      const rowKey = cellAt(row, 34);
      const managementId = cellAt(row, 25);
      const confirmed = toBool(row[0]);
      const lightCurrent = cellAt(row, 32) || combineStatus(cellAt(row, 8), cellAt(row, 9));
      const masterList = managementId ? masterStatuses.get(managementId) : undefined;
      const snapshot =
        snapshots.get(rowKey) ?? (managementId ? snapshots.get(`M:${managementId}`) : undefined) ?? "";
      const confirmedStatus = snapshot || cellAt(row, 31);

      // 確認済みチェック後に大元シートの現在値がスナップショットと一致しなくなったら差分。
      // 重複予約 (同一管理IDの複数行) の誤検知を避けるため「一覧に無ければ変更」とする
      const statusChanged = masterList
        ? !masterList.includes(confirmedStatus)
        : Boolean(lightCurrent) && lightCurrent !== confirmedStatus;
      const changeDetected =
        (confirmed && Boolean(confirmedStatus) && statusChanged) || toBool(row[33]);

      return {
        rowIndex: sheetRow,
        rowKey,
        managementId,
        confirmed,
        diffConfirmed: toBool(row[1]),
        customerName: cellAt(row, 2),
        staffName: cellAt(row, 3),
        seminar: cellAt(row, 4),
        appliedAt: formatSheetValue(cellAt(row, 5)),
        interviewAt: formatSheetValue(cellAt(row, 6)),
        interviewDate: parseDateKey(formatSheetValue(cellAt(row, 6))),
        inflow: cellAt(row, 7),
        seated: cellAt(row, 8),
        status: cellAt(row, 9),
        plan: cellAt(row, 16),
        confirmedStatus,
        currentStatus: masterList ? masterList.join(" | ") : lightCurrent,
        changeDetected,
      };
    });
}

function mapFalseReports(
  rows: string[][],
  masterStatuses: Map<string, string[]>,
  snapshots: Map<string, string>,
): FalseReportRow[] {
  return rows
    .slice(1)
    .map((row, index) => ({ row, sheetRow: index + 2 }))
    .filter(({ row }) => cellAt(row, 5) || cellAt(row, 0))
    .map(({ row, sheetRow }) => {
      const rowKey = cellAt(row, 32);
      const managementId = cellAt(row, 28);
      const falseReport = cellAt(row, 0);
      // 旧まとめシートからの移行分は、虚偽報告時点のステータスが残っていない。
      // スナップショット(移行時のコピー=変更後の値)を「変更前」として出すと誤解を生むため空にする
      const legacy = falseReport.includes("旧まとめシート");
      const snapshot = legacy
        ? ""
        : snapshots.get(rowKey) ?? (managementId ? snapshots.get(`M:${managementId}`) : undefined) ?? "";
      const masterList = managementId ? masterStatuses.get(managementId) : undefined;
      return {
        rowIndex: sheetRow,
        rowKey,
        managementId,
        legacy,
        falseReport,
        correctReport: cellAt(row, 1),
        confirmedStatus: snapshot,
        currentStatus: masterList ? masterList.join(" | ") : combineStatus(cellAt(row, 11), cellAt(row, 12)),
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

export async function GET() {
  try {
    const [
      customerRows,
      falseReportRows,
      confirmedTabRows,
      checkManagementRows,
      confirmCheckRows,
      masterRows,
    ] = await Promise.all([
      fetchCsv(CUSTOMERS_GID),
      fetchCsv(FALSE_REPORTS_GID),
      // 以下の補助タブ/大元照合は取得失敗しても本体表示を止めない
      fetchCsvOptional(csvUrl(CONFIRMED_TAB_GID)),
      fetchCsvOptional(lightSheetByNameUrl(CHECK_MANAGEMENT_SHEET_NAME)),
      fetchCsvOptional(lightSheetByNameUrl(CONFIRM_CHECKS_SHEET_NAME)),
      fetchCsvOptional(masterStatusUrl()),
    ]);

    const masterStatuses = mapMasterStatuses(masterRows);
    const snapshots = mapSnapshots(checkManagementRows, confirmedTabRows, confirmCheckRows);

    const data: FalseReportCheckerData = {
      updatedAt: new Date().toISOString(),
      writeEnabled: isWriteEnabled(),
      customers: mapCustomers(customerRows, masterStatuses, snapshots),
      falseReports: mapFalseReports(falseReportRows, masterStatuses, snapshots),
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
