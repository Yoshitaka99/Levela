function patchCleanupFinalNoUi() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('顧客管理');
  if (!sheet) return;
  const keepColumns = 23;
  const extraColumns = Math.max(sheet.getLastColumn() - keepColumns, 0);
  if (extraColumns > 0) {
    sheet.getRange(1, keepColumns + 1, sheet.getMaxRows(), extraColumns)
      .clearContent()
      .clearDataValidations()
      .clearFormat();
  }
}
