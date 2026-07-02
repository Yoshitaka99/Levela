/**
 * 虚偽報告チェックWebアプリ用の書き込み中継 Web App。
 *
 * 対象は軽量版シートのみ。
 * 大元の顧客管理シート (1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s) には
 * 絶対に書き込まないこと。IDをこのファイルに追加しないこと。
 *
 * 必要なスクリプトプロパティ:
 *   FALSE_REPORT_WEBHOOK_SECRET ... Next.js 側と共有する秘密文字列
 *
 * デプロイ設定:
 *   実行ユーザー: 自分 / アクセスできるユーザー: 全員
 */

var LIGHT_SPREADSHEET_ID = "1npumMCuzudexL9ZE4jr8tTMRh9j23eKXOatAqQ71uiY";

var SHEET_CUSTOMERS = "顧客管理_自動反映";
var SHEET_FALSE_REPORTS = "虚偽報告集計";
var SHEET_REPLIES = "返信あり顧客リスト";

// 顧客管理_自動反映: 1行目はバナー、2行目がヘッダー、3行目からデータ
var CUSTOMERS_HEADER_ROW = 2;
var CUSTOMERS_COL_CONFIRMED = 1; // A: 確認済み
var CUSTOMERS_COL_DIFF_CONFIRMED = 2; // B: 差分確認済み
var CUSTOMERS_COL_NAME = 3; // C: お客様名
var CUSTOMERS_COL_SEATED = 9; // I: 着席
var CUSTOMERS_COL_STATUS = 10; // J: 2回目/実施後ステータス
var CUSTOMERS_COL_MGMT_ID = 26; // Z: 管理ID
var CUSTOMERS_COL_ROW_KEY = 35; // AI: 行キー

// 確認済みチェック時のステータススナップショット (このWeb App専用タブ)。
// 大元シート変更の検知 (虚偽報告拾い上げ) はNext.js側がこのスナップショットと
// 大元シートの現在値を照合して行う。
var SHEET_CONFIRM_CHECKS = "確認チェック";
var CONFIRM_CHECKS_HEADERS = ["行キー", "お客様名", "管理ID", "確認時点ステータス", "確認日時"];

// 虚偽報告集計: 1行目がヘッダー
var FALSE_REPORTS_HEADER_ROW = 1;
var FALSE_REPORTS_COL_MEMO = 5; // E: メモ
var FALSE_REPORTS_COL_CUSTOMER = 6; // F: お客様名
var FALSE_REPORTS_COL_MGMT_ID = 29; // AC: 管理ID
var FALSE_REPORTS_COL_ROW_KEY = 33; // AG: 行キー

// 返信あり顧客リスト: 1行目がヘッダー
// A~E列はFILTER数式による自動生成、F/G列のみ実セル(チェックボックス)。
// H/I/J列に書いた値はシート側の定期リビルドで消えるため使わない。
var REPLIES_HEADER_ROW = 1;
var REPLIES_COL_APPLIED_AT = 1; // A: お申し込み日
var REPLIES_COL_CUSTOMER_NAME = 4; // D: 顧客名
var REPLIES_COL_CONTACTED = 7; // G: 連絡済み

// 返信あり顧客のステータス/成約状況/メモの永続ストア (このWeb App専用タブ)
var SHEET_REPLY_CHECKS = "返信チェック";
var REPLY_CHECKS_HEADERS = [
  "キー",
  "お申し込み日",
  "顧客名",
  "予約時間",
  "着座/ステータス",
  "成約状況",
  "メモ",
  "更新日時",
];

function doGet() {
  var hasSecret = Boolean(getSecret());
  return jsonResponse({
    ok: true,
    service: "false-report-webapp",
    secretConfigured: hasSecret,
  });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : "{}");
  } catch (err) {
    return jsonResponse({ ok: false, error: "invalid JSON body" });
  }

  var secret = getSecret();
  if (!secret) {
    return jsonResponse({ ok: false, error: "FALSE_REPORT_WEBHOOK_SECRET が未設定です" });
  }
  if (!body.secret || body.secret !== secret) {
    return jsonResponse({ ok: false, error: "unauthorized" });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (body.action) {
      case "getData":
        return jsonResponse(handleGetData());
      case "setConfirmed":
        return jsonResponse(handleSetCustomerCheckbox(body, CUSTOMERS_COL_CONFIRMED));
      case "setDiffConfirmed":
        return jsonResponse(handleSetCustomerCheckbox(body, CUSTOMERS_COL_DIFF_CONFIRMED));
      case "saveFalseReportMemo":
        return jsonResponse(handleSaveFalseReportMemo(body));
      case "updateReply":
        return jsonResponse(handleUpdateReply(body));
      default:
        return jsonResponse({ ok: false, error: "unknown action: " + body.action });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function handleGetData() {
  var ss = SpreadsheetApp.openById(LIGHT_SPREADSHEET_ID);
  var customers = ss.getSheetByName(SHEET_CUSTOMERS);
  var falseReports = ss.getSheetByName(SHEET_FALSE_REPORTS);
  var replies = ss.getSheetByName(SHEET_REPLIES);
  var replyChecks = ensureReplyChecksSheet(ss);
  var confirmChecks = ensureSheetWithHeaders(ss, SHEET_CONFIRM_CHECKS, CONFIRM_CHECKS_HEADERS);
  return {
    ok: true,
    counts: {
      customers: customers ? Math.max(customers.getLastRow() - CUSTOMERS_HEADER_ROW, 0) : -1,
      falseReports: falseReports ? Math.max(falseReports.getLastRow() - FALSE_REPORTS_HEADER_ROW, 0) : -1,
      replies: replies ? Math.max(replies.getLastRow() - REPLIES_HEADER_ROW, 0) : -1,
      replyChecks: Math.max(replyChecks.getLastRow() - 1, 0),
      confirmChecks: Math.max(confirmChecks.getLastRow() - 1, 0),
    },
  };
}

/**
 * 行キーは重複することがある (重複予約など、同じ管理IDの複数行) ため、
 * rowIndex(シート行番号) を行キーで検証してから書き込む。
 * ズレていた場合のみ行キーで探し直す。
 */
function handleSetCustomerCheckbox(body, column) {
  if (!body.rowKey) return { ok: false, error: "rowKey は必須です" };
  var value = body.value === true;

  var sheet = getSheetOrThrow(SHEET_CUSTOMERS);
  var row = 0;
  var rowIndex = Number(body.rowIndex);
  if (rowIndex > CUSTOMERS_HEADER_ROW && rowIndex <= sheet.getLastRow()) {
    var keyAt = String(sheet.getRange(rowIndex, CUSTOMERS_COL_ROW_KEY).getValue()).trim();
    if (keyAt === String(body.rowKey).trim()) row = rowIndex;
  }
  if (!row) row = findRowByKey(sheet, CUSTOMERS_COL_ROW_KEY, CUSTOMERS_HEADER_ROW, body.rowKey);
  if (!row) return { ok: false, error: "行キーが見つかりません: " + body.rowKey };

  sheet.getRange(row, column).setValue(value);

  if (column === CUSTOMERS_COL_CONFIRMED) {
    if (value) recordConfirmSnapshot(sheet, row, body.rowKey);
    else removeConfirmSnapshot(body.rowKey);
  }
  return { ok: true, row: row, value: value };
}

/**
 * 確認済みチェック時点のステータスを「確認チェック」タブへ記録する。
 * 既にスナップショットがある場合は上書きしない (最初の確認時点を保持)。
 */
function recordConfirmSnapshot(customersSheet, row, rowKey) {
  var ss = SpreadsheetApp.openById(LIGHT_SPREADSHEET_ID);
  var sheet = ensureSheetWithHeaders(ss, SHEET_CONFIRM_CHECKS, CONFIRM_CHECKS_HEADERS);
  if (findRowByKey(sheet, 1, 1, rowKey)) return;

  var values = customersSheet.getRange(row, 1, 1, CUSTOMERS_COL_ROW_KEY).getValues()[0];
  var seated = String(values[CUSTOMERS_COL_SEATED - 1] || "").trim();
  var status = String(values[CUSTOMERS_COL_STATUS - 1] || "").trim();
  var combined = status ? seated + " / " + status : seated;

  sheet.appendRow([
    String(rowKey).trim(),
    String(values[CUSTOMERS_COL_NAME - 1] || "").trim(),
    String(values[CUSTOMERS_COL_MGMT_ID - 1] || "").trim(),
    combined,
    new Date(),
  ]);
}

function removeConfirmSnapshot(rowKey) {
  var ss = SpreadsheetApp.openById(LIGHT_SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_CONFIRM_CHECKS);
  if (!sheet) return;
  var row = findRowByKey(sheet, 1, 1, rowKey);
  if (row) sheet.deleteRow(row);
}

/**
 * 既存データは行キー(AG列)が空のことがあるため、
 * 行キー → 管理ID → 行番号+お客様名 の順で行を特定する。
 */
function handleSaveFalseReportMemo(body) {
  var sheet = getSheetOrThrow(SHEET_FALSE_REPORTS);
  var row = 0;

  if (body.rowKey) {
    row = findRowByKey(sheet, FALSE_REPORTS_COL_ROW_KEY, FALSE_REPORTS_HEADER_ROW, body.rowKey);
  }
  if (!row && body.managementId) {
    row = findRowByKey(sheet, FALSE_REPORTS_COL_MGMT_ID, FALSE_REPORTS_HEADER_ROW, body.managementId);
  }
  if (!row && Number(body.rowIndex) > FALSE_REPORTS_HEADER_ROW) {
    var rowIndex = Number(body.rowIndex);
    var name = String(body.customerName || "").trim();
    if (
      rowIndex <= sheet.getLastRow() &&
      name &&
      String(sheet.getRange(rowIndex, FALSE_REPORTS_COL_CUSTOMER).getValue()).trim() === name
    ) {
      row = rowIndex;
    }
  }
  if (!row) {
    return { ok: false, error: "虚偽報告の行が見つかりません: " + (body.customerName || body.rowKey || "?") };
  }

  sheet.getRange(row, FALSE_REPORTS_COL_MEMO).setValue(String(body.memo || ""));
  return { ok: true, row: row };
}

function handleUpdateReply(body) {
  var updated = {};
  var row = 0;

  if (typeof body.contacted === "boolean") {
    var sheet = getSheetOrThrow(SHEET_REPLIES);
    row = findReplyRow(sheet, body);
    if (!row) {
      return { ok: false, error: "返信あり顧客の行が見つかりません: " + (body.customerName || "?") };
    }
    sheet.getRange(row, REPLIES_COL_CONTACTED).setValue(body.contacted);
    updated.contacted = body.contacted;
  }

  var hasCheckFields =
    typeof body.status === "string" ||
    typeof body.contractStatus === "string" ||
    typeof body.memo === "string";
  var checkRow = 0;
  if (hasCheckFields) {
    checkRow = upsertReplyCheck(body, updated);
  }

  return { ok: true, row: row, checkRow: checkRow, updated: updated };
}

/**
 * ステータス/成約状況/メモを「返信チェック」タブへキー単位でupsertする。
 * 返信あり顧客リストのH/I/J列はシート側リビルドで消えるため使えない。
 */
function upsertReplyCheck(body, updated) {
  var name = String(body.customerName || "").trim();
  if (!name) throw new Error("customerName は必須です");
  var key = buildReplyKey(body.appliedAt, name, body.slot);

  var ss = SpreadsheetApp.openById(LIGHT_SPREADSHEET_ID);
  var sheet = ensureReplyChecksSheet(ss);
  var row = findRowByKey(sheet, 1, 1, key);
  if (!row) {
    row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 4).setValues([
      [key, normalizeAppliedKey(body.appliedAt), name, String(body.slot || "").trim()],
    ]);
  }

  if (typeof body.status === "string") {
    sheet.getRange(row, 5).setValue(body.status);
    updated.status = body.status;
  }
  if (typeof body.contractStatus === "string") {
    sheet.getRange(row, 6).setValue(body.contractStatus);
    updated.contractStatus = body.contractStatus;
  }
  if (typeof body.memo === "string") {
    sheet.getRange(row, 7).setValue(body.memo);
    updated.memo = body.memo;
  }
  sheet.getRange(row, 8).setValue(new Date());
  return row;
}

function buildReplyKey(appliedAt, customerName, slot) {
  return (
    normalizeAppliedKey(appliedAt) +
    "|" +
    String(customerName || "").trim() +
    "|" +
    String(slot || "").trim()
  );
}

/**
 * お申し込み日はシリアル値のため、CSV出力の丸め(小数5桁)に合わせて正規化する。
 * Next.js側 (route.ts) と同じロジックにすること。
 */
function normalizeAppliedKey(value) {
  var text = String(value == null ? "" : value).trim();
  var num = Number(text);
  if (text && !isNaN(num)) return String(Math.round(num * 100000) / 100000);
  return text;
}

function ensureReplyChecksSheet(ss) {
  return ensureSheetWithHeaders(ss, SHEET_REPLY_CHECKS, REPLY_CHECKS_HEADERS);
}

function ensureSheetWithHeaders(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

/**
 * 返信あり顧客リストには行キー列がないため、
 * rowIndex(シート行番号)を顧客名で検証し、ズレていたら
 * お申し込み日+顧客名で探し直す。
 */
function findReplyRow(sheet, body) {
  var lastRow = sheet.getLastRow();
  var name = String(body.customerName || "").trim();
  var rowIndex = Number(body.rowIndex);

  if (rowIndex >= REPLIES_HEADER_ROW + 1 && rowIndex <= lastRow) {
    var nameAt = String(sheet.getRange(rowIndex, REPLIES_COL_CUSTOMER_NAME).getValue()).trim();
    if (name && nameAt === name) return rowIndex;
  }
  if (!name) return 0;

  var appliedAt = normalizeAppliedKey(body.appliedAt);
  var values = sheet
    .getRange(REPLIES_HEADER_ROW + 1, 1, Math.max(lastRow - REPLIES_HEADER_ROW, 0), REPLIES_COL_CUSTOMER_NAME)
    .getValues();
  var fallback = 0;
  for (var i = 0; i < values.length; i += 1) {
    var rowName = String(values[i][REPLIES_COL_CUSTOMER_NAME - 1]).trim();
    if (rowName !== name) continue;
    var rowApplied = normalizeAppliedKey(values[i][REPLIES_COL_APPLIED_AT - 1]);
    if (appliedAt && rowApplied === appliedAt) return REPLIES_HEADER_ROW + 1 + i;
    if (!fallback) fallback = REPLIES_HEADER_ROW + 1 + i;
  }
  return fallback;
}

function findRowByKey(sheet, keyColumn, headerRow, rowKey) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) return 0;
  var values = sheet.getRange(headerRow + 1, keyColumn, lastRow - headerRow, 1).getValues();
  var key = String(rowKey).trim();
  for (var i = 0; i < values.length; i += 1) {
    if (String(values[i][0]).trim() === key) return headerRow + 1 + i;
  }
  return 0;
}

function getSheetOrThrow(name) {
  var sheet = SpreadsheetApp.openById(LIGHT_SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error("シートが見つかりません: " + name);
  return sheet;
}

function getSecret() {
  return PropertiesService.getScriptProperties().getProperty("FALSE_REPORT_WEBHOOK_SECRET") || "";
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
