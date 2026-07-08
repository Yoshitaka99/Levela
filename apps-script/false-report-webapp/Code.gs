const DEFAULT_SPREADSHEET_ID = "1npumMCuzudexL9ZE4jr8tTMRh9j23eKXOatAqQ71uiY";
const TAB_CUSTOMERS = "顧客管理_自動反映";
const TAB_FALSE_REPORTS = "虚偽報告集計";
const TAB_PROBLEM_OK = "問題無し";
const TAB_REPLIES = "返信あり顧客リスト";
const HANDLERS = ["成勢将司", "野中碧", "梅津真珠", "笠松佑衣", "大谷みくに"];

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    verifySecret_(body.secret);

    if (body.action === "getData") {
      return json_({ ok: true, data: getData_() });
    }

    if (body.action === "setConfirmed") {
      requireRowNumber_(body.rowNumber);
      getSheet_(TAB_CUSTOMERS).getRange(body.rowNumber, 1).setValue(Boolean(body.checked));
      return json_({ ok: true });
    }

    if (body.action === "setDiffReviewed") {
      requireRowNumber_(body.rowNumber);
      getSheet_(TAB_CUSTOMERS).getRange(body.rowNumber, 2).setValue(Boolean(body.checked));
      return json_({ ok: true });
    }

    if (body.action === "saveFalseReportMemo") {
      requireRowNumber_(body.rowNumber);
      getSheet_(TAB_FALSE_REPORTS).getRange(body.rowNumber, 5).setValue(String(body.memo || ""));
      return json_({ ok: true });
    }

    if (body.action === "updateReply") {
      requireRowNumber_(body.rowNumber);
      updateReply_(body);
      return json_({ ok: true });
    }

    if (body.action === "applyDiffDecisions") {
      applyDiffDecisions_(body);
      return json_({ ok: true });
    }

    throw new Error("Unsupported action: " + body.action);
  } catch (error) {
    return json_({ ok: false, message: String(error && error.message ? error.message : error) });
  }
}

function authorize() {
  const data = getData_();
  return {
    ok: true,
    customers: data.stats.totalCustomers,
    falseReports: data.stats.falseReports,
    replies: data.stats.replies,
  };
}

function getData_() {
  const customers = mapCustomers_();
  const falseReports = mapFalseReports_();
  const problemOk = mapProblemOk_();
  const replies = mapReplies_();

  return {
    updatedAt: new Date().toISOString(),
    writeReady: true,
    source: "apps-script",
    sheetsUrl: "https://docs.google.com/spreadsheets/d/" + getSpreadsheetId_() + "/edit",
    customers,
    falseReports,
    problemOk,
    replies,
    stats: {
      totalCustomers: customers.length,
      confirmedCustomers: customers.filter((row) => row.confirmed).length,
      changedCustomers: customers.filter((row) => row.changed).length,
      unreviewedChanges: customers.filter((row) => row.changed && !row.diffReviewed).length,
      falseReports: falseReports.length,
      problemOk: problemOk.length,
      replies: replies.length,
    },
  };
}

function mapCustomers_() {
  const sheet = getSheet_(TAB_CUSTOMERS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 36).getDisplayValues();
  return rows.slice(1).reduce((items, row, index) => {
    const customerName = cell_(row, 2);
    if (!customerName) return items;

    const confirmedSeatStatus = cell_(row, 31);
    const confirmedSecondStatus = cell_(row, 32);
    const currentSeatStatus = cell_(row, 8);
    const currentSecondStatus = cell_(row, 9);
    const changed =
      toBool_(cell_(row, 33)) ||
      (!!confirmedSeatStatus && confirmedSeatStatus !== currentSeatStatus) ||
      (!!confirmedSecondStatus && confirmedSecondStatus !== currentSecondStatus);

    items.push({
      rowNumber: index + 3,
      confirmed: toBool_(cell_(row, 0)),
      diffReviewed: toBool_(cell_(row, 1)),
      customerName,
      ownerName: cell_(row, 3),
      seminar: cell_(row, 4),
      applicationDate: cell_(row, 5),
      meetingDate: cell_(row, 6),
      source: cell_(row, 7),
      seatStatus: currentSeatStatus,
      secondStatus: currentSecondStatus,
      confirmedSeatStatus,
      confirmedSecondStatus,
      currentSeatStatus,
      currentSecondStatus,
      changed,
      rowKey: cell_(row, 34) || customerName + "_" + cell_(row, 3) + "_" + cell_(row, 4),
    });

    return items;
  }, []);
}

function mapFalseReports_() {
  const sheet = getSheet_(TAB_FALSE_REPORTS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(1, 1, lastRow, Math.min(sheet.getLastColumn(), 30)).getDisplayValues();
  return rows.slice(1).reduce((items, row, index) => {
    const falseReport = cell_(row, 0);
    const correctReport = cell_(row, 1);
    const detectedAt = cell_(row, 2);
    const customerName = cell_(row, 5);
    if (!falseReport && !correctReport && !detectedAt && !customerName) return items;

    items.push({
      rowNumber: index + 2,
      falseReport,
      correctReport,
      detectedAt,
      confirmedAt: cell_(row, 3),
      memo: cell_(row, 4),
      customerName,
      ownerName: cell_(row, 6),
      seminar: cell_(row, 7),
      seatStatus: cell_(row, 8),
      secondStatus: cell_(row, 9),
    });

    return items;
  }, []);
}

function mapProblemOk_() {
  const sheet = ensureLogSheet_(TAB_PROBLEM_OK);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(1, 1, lastRow, Math.min(sheet.getLastColumn(), 11)).getDisplayValues();
  return rows.slice(1).reduce((items, row, index) => {
    const falseReport = cell_(row, 0);
    const correctReport = cell_(row, 1);
    const reflectedAt = cell_(row, 2);
    const customerName = cell_(row, 5);
    if (!falseReport && !correctReport && !reflectedAt && !customerName) return items;

    items.push({
      rowNumber: index + 2,
      falseReport,
      correctReport,
      reflectedAt,
      handler: cell_(row, 3),
      memo: cell_(row, 4),
      customerName,
      ownerName: cell_(row, 6),
      seminar: cell_(row, 7),
      seatStatus: cell_(row, 8),
      secondStatus: cell_(row, 9),
      sourceRowNumber: cell_(row, 10),
    });

    return items;
  }, []);
}

function mapReplies_() {
  const sheet = getSheet_(TAB_REPLIES);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(1, 1, lastRow, Math.min(sheet.getLastColumn(), 10)).getDisplayValues();
  return rows.slice(1).reduce((items, row, index) => {
    const customerName = cell_(row, 0);
    if (!customerName) return items;

    items.push({
      rowNumber: index + 2,
      customerName,
      ownerName: cell_(row, 1),
      seminar: cell_(row, 2),
      replyAt: cell_(row, 3),
      memo: cell_(row, 4),
      messageDone: toBool_(cell_(row, 5)),
      contacted: toBool_(cell_(row, 6)),
      seatStatus: cell_(row, 7),
      contractStatus: cell_(row, 8),
      contactMemo: cell_(row, 9),
    });

    return items;
  }, []);
}

function applyDiffDecisions_(body) {
  if (!HANDLERS.includes(String(body.handler || ""))) {
    throw new Error("Invalid handler");
  }
  if (!Array.isArray(body.decisions) || !body.decisions.length) {
    throw new Error("No decisions");
  }

  const customerSheet = getSheet_(TAB_CUSTOMERS);
  const falseReportSheet = ensureLogSheet_(TAB_FALSE_REPORTS);
  const problemOkSheet = ensureLogSheet_(TAB_PROBLEM_OK);
  const now = new Date();

  body.decisions.forEach(function (decision) {
    requireRowNumber_(decision.rowNumber);
    if (decision.decision !== "ok" && decision.decision !== "ng") {
      throw new Error("Invalid decision");
    }

    const values = customerSheet.getRange(decision.rowNumber, 1, 1, 36).getDisplayValues()[0];
    const record = buildDecisionRecord_(values, decision.rowNumber, body.handler, now);
    customerSheet.getRange(decision.rowNumber, 2).setValue(true);

    if (decision.decision === "ok") {
      appendUniqueLogRow_(problemOkSheet, [
        record.falseReport,
        record.correctReport,
        record.timestamp,
        record.handler,
        "OK",
        record.customerName,
        record.ownerName,
        record.seminar,
        record.currentSeatStatus,
        record.currentSecondStatus,
        String(decision.rowNumber),
      ]);
    } else {
      appendUniqueLogRow_(falseReportSheet, [
        record.falseReport,
        record.correctReport,
        record.timestamp,
        record.timestamp,
        "対応者: " + record.handler,
        record.customerName,
        record.ownerName,
        record.seminar,
        record.currentSeatStatus,
        record.currentSecondStatus,
        String(decision.rowNumber),
      ]);
    }
  });
}

function buildDecisionRecord_(row, sourceRowNumber, handler, now) {
  const confirmedSeatStatus = cell_(row, 31);
  const confirmedSecondStatus = cell_(row, 32);
  const currentSeatStatus = cell_(row, 8);
  const currentSecondStatus = cell_(row, 9);

  return {
    falseReport: [confirmedSeatStatus || "-", confirmedSecondStatus || "-"].join(" / "),
    correctReport: [currentSeatStatus || "-", currentSecondStatus || "-"].join(" / "),
    timestamp: Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss"),
    handler: String(handler || ""),
    customerName: cell_(row, 2),
    ownerName: cell_(row, 3),
    seminar: cell_(row, 4),
    currentSeatStatus,
    currentSecondStatus,
    sourceRowNumber: String(sourceRowNumber),
  };
}

function appendUniqueLogRow_(sheet, row) {
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const width = Math.min(Math.max(sheet.getLastColumn(), 11), 11);
    const values = sheet.getRange(2, 1, lastRow - 1, width).getDisplayValues();
    const sourceRowNumber = String(row[10] || "");
    const falseReport = String(row[0] || "");
    const correctReport = String(row[1] || "");
    const customerName = String(row[5] || "");
    const exists = values.some(function (existing) {
      const existingSource = cell_(existing, 10);
      if (sourceRowNumber && existingSource === sourceRowNumber) return true;
      return cell_(existing, 0) === falseReport && cell_(existing, 1) === correctReport && cell_(existing, 5) === customerName;
    });
    if (exists) return;
  }

  sheet.appendRow(row);
}

function updateReply_(body) {
  const columns = {
    messageDone: 6,
    contacted: 7,
    seatStatus: 8,
    contractStatus: 9,
    contactMemo: 10,
  };
  const column = columns[body.field];
  if (!column) throw new Error("Unsupported reply field: " + body.field);

  const booleanFields = { messageDone: true, contacted: true };
  const value = booleanFields[body.field] ? Boolean(body.value) : String(body.value || "");
  getSheet_(TAB_REPLIES).getRange(body.rowNumber, column).setValue(value);
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error("Sheet not found: " + name);
  return sheet;
}

function ensureLogSheet_(name) {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    if (name === TAB_PROBLEM_OK) {
      sheet
        .getRange(1, 1, 1, 11)
        .setValues([["確認時報告", "正しい報告", "反映日時", "対応者", "メモ", "顧客名", "担当者", "ローンチ", "現在着座", "現在ステータス", "元行"]]);
    } else {
      sheet
        .getRange(1, 1, 1, 11)
        .setValues([["虚偽報告", "正しい報告", "検知日時", "確認日時", "メモ", "顧客名", "担当者", "ローンチ", "現在着座", "現在ステータス", "元行"]]);
    }
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(getSpreadsheetId_());
}

function getSpreadsheetId_() {
  return PropertiesService.getScriptProperties().getProperty("FALSE_REPORT_SPREADSHEET_ID") || DEFAULT_SPREADSHEET_ID;
}

function verifySecret_(actual) {
  const expected = PropertiesService.getScriptProperties().getProperty("FALSE_REPORT_WEBHOOK_SECRET");
  if (!expected) {
    throw new Error("FALSE_REPORT_WEBHOOK_SECRET is not set");
  }
  if (actual !== expected) {
    throw new Error("Invalid secret");
  }
}

function requireRowNumber_(rowNumber) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error("Invalid rowNumber");
  }
}

function toBool_(value) {
  return String(value || "").trim().toUpperCase() === "TRUE";
}

function cell_(row, index) {
  return String(row[index] || "").trim();
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
