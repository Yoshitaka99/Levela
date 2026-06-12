const TEAM_SALES_KPI_MIRROR_CONFIG = {
  sourceSpreadsheetId: "1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s",
  sourceSheetName: "顧客管理",
  targetSpreadsheetId: "1a3WimNtSLyepfTZ3YxZmy3XAaV6eIG_8C-BdoAd4aIA",
  targetSheetName: "KPI_MIRROR",
  chunkSize: 2000,
  columns: [
    { sourceIndex: 1, header: "担当者名" },
    { sourceIndex: 2, header: "セミナー" },
    { sourceIndex: 3, header: "流入経路" },
    { sourceIndex: 4, header: "面談日" },
    { sourceIndex: 5, header: "流入" },
    { sourceIndex: 6, header: "着席" },
    { sourceIndex: 7, header: "ステータス" },
    { sourceIndex: 8, header: "保留回答予定日" },
    { sourceIndex: 13, header: "決着日(着金日)" },
    { sourceIndex: 14, header: "成約プラン" },
    { sourceIndex: 16, header: "失注理由" },
    { sourceIndex: 17, header: "保留理由" },
    { sourceIndex: 19, header: "保留理由2" },
  ],
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("KPIミラー")
    .addItem("今すぐ更新", "refreshTeamSalesKpiMirror")
    .addItem("5分更新をセット", "setupTeamSalesKpiMirror")
    .addToUi();
}

function setupTeamSalesKpiMirror() {
  refreshTeamSalesKpiMirror();

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === "refreshTeamSalesKpiMirror")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("refreshTeamSalesKpiMirror").timeBased().everyMinutes(5).create();
}

function refreshTeamSalesKpiMirror() {
  const config = TEAM_SALES_KPI_MIRROR_CONFIG;
  const sourceSheet = SpreadsheetApp.openById(config.sourceSpreadsheetId).getSheetByName(config.sourceSheetName);
  if (!sourceSheet) {
    throw new Error(`Source sheet not found: ${config.sourceSheetName}`);
  }

  const targetSpreadsheet = SpreadsheetApp.openById(config.targetSpreadsheetId);
  const targetSheet =
    targetSpreadsheet.getSheetByName(config.targetSheetName) || targetSpreadsheet.insertSheet(config.targetSheetName);

  const sourceValues = sourceSheet.getDataRange().getDisplayValues();
  const headers = config.columns.map((column) => column.header);
  const output = [headers];

  for (let rowIndex = 1; rowIndex < sourceValues.length; rowIndex += 1) {
    const sourceRow = sourceValues[rowIndex];
    const owner = String(sourceRow[1] || "").trim();
    const seminar = String(sourceRow[2] || "").trim();
    if (!owner || !seminar) continue;

    output.push(config.columns.map((column) => sourceRow[column.sourceIndex] || ""));
  }

  prepareTargetSheet_(targetSheet, output.length, headers.length);
  writeRowsInChunks_(targetSheet, output, config.chunkSize);

  targetSheet.setFrozenRows(1);
  targetSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  targetSheet.autoResizeColumns(1, headers.length);

  PropertiesService.getDocumentProperties().setProperties(
    {
      lastSyncedAt: new Date().toISOString(),
      lastSyncedRows: String(Math.max(output.length - 1, 0)),
      csvUrl: getTeamSalesKpiMirrorCsvUrl(),
    },
    true,
  );
}

function prepareTargetSheet_(sheet, rowCount, columnCount) {
  const targetRows = Math.max(rowCount, 1000);
  const targetColumns = Math.max(columnCount, 13);

  if (sheet.getMaxRows() < targetRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), targetRows - sheet.getMaxRows());
  }
  if (sheet.getMaxColumns() < targetColumns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), targetColumns - sheet.getMaxColumns());
  }

  sheet.clearContents();
}

function writeRowsInChunks_(sheet, values, chunkSize) {
  for (let start = 0; start < values.length; start += chunkSize) {
    const chunk = values.slice(start, start + chunkSize);
    sheet.getRange(start + 1, 1, chunk.length, chunk[0].length).setValues(chunk);
  }
}

function getTeamSalesKpiMirrorStatus() {
  const config = TEAM_SALES_KPI_MIRROR_CONFIG;
  const properties = PropertiesService.getDocumentProperties();
  const triggers = ScriptApp.getProjectTriggers().filter(
    (trigger) => trigger.getHandlerFunction() === "refreshTeamSalesKpiMirror",
  );

  return {
    targetSpreadsheetId: config.targetSpreadsheetId,
    targetSheetName: config.targetSheetName,
    csvUrl: getTeamSalesKpiMirrorCsvUrl(),
    lastSyncedAt: properties.getProperty("lastSyncedAt") || "",
    lastSyncedRows: properties.getProperty("lastSyncedRows") || "0",
    refreshTriggerCount: triggers.length,
  };
}

function getTeamSalesKpiMirrorCsvUrl() {
  const config = TEAM_SALES_KPI_MIRROR_CONFIG;
  return `https://docs.google.com/spreadsheets/d/${config.targetSpreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    config.targetSheetName,
  )}`;
}
