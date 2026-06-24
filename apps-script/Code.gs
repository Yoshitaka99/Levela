const CONFIG = {
  setupSheetName: '▶ セットアップ',
  settingsSheetName: '設定',
  appointmentsSheetName: 'アポ原本',
  customersSheetName: '顧客管理',
  kpiSheetName: 'KPI分析',
  goalsSheetName: '目標',
  legacySheetNames: ['シート1', 'シート2'],
  calendarCells: ['C7', 'C8'],
  salespersonNameCell: 'C8',
  statusCell: 'C10',
  lookbackDays: 45,
  lookaheadDays: 45,
  triggerFunction: 'syncCalendarAppointments',
};

const APPOINTMENT_HEADERS = [
  'eventId', 'calendarId', '担当者', '開始日時', '終了日時', '日付', '時間',
  'お客様名', '予定タイトル', '説明', '場所', 'ゲストメール', '最終同期日時'
];

const CUSTOMER_HEADERS = [
  '顧客ID', 'eventId', '担当者', 'お客様名', '面談日', '面談時間',
  'セミナー', '流入経路', '流入', '着席', '成約予定NA',
  '着金予定日', '決着日(着金日)', '成約プラン', '支払方法', '失注理由',
  '保留理由', '失注理由詳細', '証明動画', '勉強会参加日',
  'Lステ顧客ID', '最終同期日時', '手動メモ'
];

const OPTIONS = {
  statuses: ['未入力', '未対応', '着席', '飛び', 'キャンセル', '2回目予定', '成約', '失注', '保留', 'クーリングオフ'],
  yesNo: ['未入力', '対象', '対象外'],
  sources: ['未入力', 'Lステ', 'Instagram', '広告', '紹介', 'セミナー', 'その他'],
  plans: ['未入力', 'ライト', 'スタンダード', 'プレミアム', '個別相談'],
  payments: ['未入力', '一括', '分割', '銀行振込', 'カード', 'その他'],
  lostReasons: ['未入力', '金額', 'タイミング', '家族反対', '競合', '連絡不通', 'その他'],
  holdReasons: ['未入力', '検討中', '日程待ち', '家族相談', '資金準備', 'その他'],
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔧 levela')
    .addItem('🔗 カレンダー連携セットアップ', 'setupCalendarIntegration')
    .addItem('🔄 今すぐ同期', 'syncCalendarAppointments')
    .addSeparator()
    .addItem('📊 KPIを再生成', 'rebuildKpiDashboard')
    .addItem('🧱 シート構成を修復', 'ensureWorkbookStructure')
    .addItem('🧼 ひな型化（連携解除）', 'prepareTemplateBase')
    .addSeparator()
    .addItem('👥 担当者コピーを作成', 'createSalespersonCopyPrompt')
    .addToUi();
}

function setupCalendarIntegration() {
  ensureWorkbookStructure();

  const setupSheet = getOrCreateSheet_(CONFIG.setupSheetName);
  const calendarId = getCalendarIdFromSetup_(setupSheet);
  const salespersonName = getSalespersonNameFromSetup_(setupSheet);

  if (!calendarId) {
    throw new Error('セットアップタブの C7 にGoogleカレンダーのメールアドレスを入力してください。');
  }
  if (!salespersonName) {
    throw new Error('セットアップタブの C8 に担当者名を入力してください。カレンダー予定名にこの名前が入っている予定だけ同期します。');
  }

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    setupSheet.getRange(CONFIG.statusCell).setValue('❌ カレンダー取得不可');
    throw new Error('カレンダーを取得できません。メールアドレス、または共有権限を確認してください。');
  }

  PropertiesService.getDocumentProperties().setProperties({
    calendarId: calendarId,
    salespersonName: salespersonName,
    lastSetupAt: new Date().toISOString(),
  });

  recreateAutoSyncTrigger_();
  syncCalendarAppointments();

  setupSheet.getRange(CONFIG.statusCell).setValue('✅ 連携済み: ' + calendarId);
  SpreadsheetApp.getActive().toast('カレンダー連携が完了しました', 'levela', 5);
}

function syncCalendarAppointments() {
  ensureWorkbookStructure();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getDocumentProperties();
  const setupSheet = getOrCreateSheet_(CONFIG.setupSheetName);

  const calendarId = props.getProperty('calendarId') || getCalendarIdFromSetup_(setupSheet);
  if (!calendarId) {
    setupSheet.getRange(CONFIG.statusCell).setValue('⏳ 未設定');
    return;
  }

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    setupSheet.getRange(CONFIG.statusCell).setValue('❌ カレンダー取得不可');
    return;
  }

  const salespersonName = props.getProperty('salespersonName') || getSalespersonNameFromSetup_(setupSheet);
  if (!salespersonName) {
    setupSheet.getRange(CONFIG.statusCell).setValue('⏳ 担当者名未設定');
    return;
  }
  const start = addDays_(new Date(), -CONFIG.lookbackDays);
  const end = addDays_(new Date(), CONFIG.lookaheadDays);
  const events = calendar.getEvents(start, end);
  const now = new Date();

  const appointmentSheet = ss.getSheetByName(CONFIG.appointmentsSheetName);
  const customerSheet = ss.getSheetByName(CONFIG.customersSheetName);
  const existingCustomers = readRowsByKey_(customerSheet, CUSTOMER_HEADERS, 'eventId');

  const appointmentRows = [];
  const customerRowsById = {};

  events.forEach(function(event) {
    if (!eventMatchesSalesperson_(event, salespersonName)) return;

    const parsed = parseCustomerFromEvent_(event, salespersonName);
    const eventId = event.getId();
    const eventStart = event.getStartTime();

    appointmentRows.push([
      eventId,
      calendarId,
      salespersonName,
      event.getStartTime(),
      event.getEndTime(),
      stripTime_(eventStart),
      formatTime_(eventStart),
      parsed.customerName,
      event.getTitle(),
      event.getDescription(),
      event.getLocation(),
      event.getGuestList().map(function(g) { return g.getEmail(); }).join(', '),
      now
    ]);

    customerRowsById[eventId] = buildCustomerRow_(event, salespersonName, parsed, now, existingCustomers[eventId]);
  });

  replaceRows_(appointmentSheet, APPOINTMENT_HEADERS, appointmentRows);
  upsertCustomerRows_(customerSheet, existingCustomers, customerRowsById);

  applyCustomerValidations_();
  rebuildKpiDashboard();

  props.setProperty('lastSyncAt', now.toISOString());
  setupSheet.getRange(CONFIG.statusCell).setValue('✅ 最終同期: ' + formatDateTime_(now));
  SpreadsheetApp.getActive().toast(appointmentRows.length + '件の予定を同期しました', 'levela', 5);
}

function prepareTemplateBase() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ひな型化しますか？',
    'カレンダー連携情報、同期トリガー、アポ原本、顧客管理のデータを空にします。テンプレート配布前に実行してください。',
    ui.ButtonSet.OK_CANCEL
  );

  if (response !== ui.Button.OK) return;

  resetTemplateBaseNoUi();
}

function resetTemplateBaseNoUi() {
  PropertiesService.getDocumentProperties().deleteAllProperties();

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });

  ensureWorkbookStructure();

  const setupSheet = getOrCreateSheet_(CONFIG.setupSheetName);
  CONFIG.calendarCells.forEach(function(cell) {
    setupSheet.getRange(cell).clearContent();
  });
  setupSheet.getRange(CONFIG.statusCell).setValue('⏳ 未設定');

  clearDataRows_(CONFIG.appointmentsSheetName, APPOINTMENT_HEADERS.length);
  clearDataRows_(CONFIG.customersSheetName, CUSTOMER_HEADERS.length);
  deleteLegacySheets_();
  resetSetupSheet_();
  rebuildKpiDashboard();

  SpreadsheetApp.getActive().toast('ひな型化しました。C7にカレンダーメールを入れてセットアップできます。', 'levela', 5);
}

function ensureWorkbookStructure() {
  ensureSetupSheet_();
  ensureSettingsSheet_();
  ensureGoalsSheet_();
  ensureTableSheet_(CONFIG.appointmentsSheetName, APPOINTMENT_HEADERS);
  ensureTableSheet_(CONFIG.customersSheetName, CUSTOMER_HEADERS);
  applyCustomerValidations_();
}

function rebuildKpiDashboard() {
  const sheet = getOrCreateSheet_(CONFIG.kpiSheetName);
  sheet.clear();
  sheet.setHiddenGridlines(true);

  sheet.getRange('A1:I1').merge().setValue('営業 KPI ダッシュボード');
  sheet.getRange('A2').setValue('最終更新');
  sheet.getRange('B2').setValue(new Date());

  sheet.getRange('A4:I4').merge().setValue('▼ 全体サマリー');
  sheet.getRange('A5:I5').setValues([[
    '総アポ数', '着席数', '着席率', '成約数', '成約率(着席比)',
    '飛び', 'キャンセル', '失注', '保留'
  ]]);

  sheet.getRange('A6').setFormula(`=COUNTA('${CONFIG.customersSheetName}'!B2:B)`);
  sheet.getRange('B6').setFormula(`=COUNTIF('${CONFIG.customersSheetName}'!J2:J,"着席")`);
  sheet.getRange('C6').setFormula('=IFERROR(B6/A6,0)');
  sheet.getRange('D6').setFormula(`=COUNTIFS('${CONFIG.customersSheetName}'!N2:N,"<>",'${CONFIG.customersSheetName}'!N2:N,"<>未入力")`);
  sheet.getRange('E6').setFormula('=IFERROR(D6/B6,0)');
  sheet.getRange('F6').setFormula(`=COUNTIF('${CONFIG.customersSheetName}'!J2:J,"飛び")`);
  sheet.getRange('G6').setFormula(`=COUNTIF('${CONFIG.customersSheetName}'!J2:J,"キャンセル")`);
  sheet.getRange('H6').setFormula(`=COUNTIFS('${CONFIG.customersSheetName}'!P2:P,"<>",'${CONFIG.customersSheetName}'!P2:P,"<>未入力")`);
  sheet.getRange('I6').setFormula(`=COUNTIFS('${CONFIG.customersSheetName}'!Q2:Q,"<>",'${CONFIG.customersSheetName}'!Q2:Q,"<>未入力")`);

  sheet.getRange('A8:I8').merge().setValue('▼ 月別集計');
  sheet.getRange('A9:I9').setValues([[
    '月', 'アポ数', '着席数', '着席率', '成約数', '成約率',
    '飛び', 'キャンセル', '失注+保留'
  ]]);

  sheet.getRange('A10').setFormula(`=SORT(UNIQUE(FILTER(TEXT('${CONFIG.customersSheetName}'!E2:E,"yyyy-mm"),'${CONFIG.customersSheetName}'!E2:E<>"")))`);
  sheet.getRange('B10').setFormula(`=ARRAYFORMULA(IF(A10:A="",,COUNTIF(TEXT('${CONFIG.customersSheetName}'!E2:E,"yyyy-mm"),A10:A)))`);
  sheet.getRange('C10').setFormula(`=ARRAYFORMULA(IF(A10:A="",,COUNTIFS(TEXT('${CONFIG.customersSheetName}'!E2:E,"yyyy-mm"),A10:A,'${CONFIG.customersSheetName}'!J2:J,"着席")))`);
  sheet.getRange('D10').setFormula('=ARRAYFORMULA(IF(A10:A="",,IFERROR(C10:C/B10:B,0)))');
  sheet.getRange('E10').setFormula(`=ARRAYFORMULA(IF(A10:A="",,COUNTIFS(TEXT('${CONFIG.customersSheetName}'!E2:E,"yyyy-mm"),A10:A,'${CONFIG.customersSheetName}'!N2:N,"<>",'${CONFIG.customersSheetName}'!N2:N,"<>未入力")))`);
  sheet.getRange('F10').setFormula('=ARRAYFORMULA(IF(A10:A="",,IFERROR(E10:E/C10:C,0)))');
  sheet.getRange('G10').setFormula(`=ARRAYFORMULA(IF(A10:A="",,COUNTIFS(TEXT('${CONFIG.customersSheetName}'!E2:E,"yyyy-mm"),A10:A,'${CONFIG.customersSheetName}'!J2:J,"飛び")))`);
  sheet.getRange('H10').setFormula(`=ARRAYFORMULA(IF(A10:A="",,COUNTIFS(TEXT('${CONFIG.customersSheetName}'!E2:E,"yyyy-mm"),A10:A,'${CONFIG.customersSheetName}'!J2:J,"キャンセル")))`);
  sheet.getRange('I10').setFormula(`=ARRAYFORMULA(IF(A10:A="",,COUNTIFS(TEXT('${CONFIG.customersSheetName}'!E2:E,"yyyy-mm"),A10:A,'${CONFIG.customersSheetName}'!P2:P,"<>",'${CONFIG.customersSheetName}'!P2:P,"<>未入力")+COUNTIFS(TEXT('${CONFIG.customersSheetName}'!E2:E,"yyyy-mm"),A10:A,'${CONFIG.customersSheetName}'!Q2:Q,"<>",'${CONFIG.customersSheetName}'!Q2:Q,"<>未入力")))`);

  sheet.getRange('A22:G22').merge().setValue('▼ 担当者別集計');
  sheet.getRange('A23:G23').setValues([[
    '担当者', 'アポ数', '着席数', '着席率', '成約数', '成約率', '失注数'
  ]]);

  sheet.getRange('A24').setFormula(`=SORT(UNIQUE(FILTER('${CONFIG.customersSheetName}'!C2:C,'${CONFIG.customersSheetName}'!C2:C<>"")))`);
  sheet.getRange('B24').setFormula(`=ARRAYFORMULA(IF(A24:A="",,COUNTIF('${CONFIG.customersSheetName}'!C2:C,A24:A)))`);
  sheet.getRange('C24').setFormula(`=ARRAYFORMULA(IF(A24:A="",,COUNTIFS('${CONFIG.customersSheetName}'!C2:C,A24:A,'${CONFIG.customersSheetName}'!J2:J,"着席")))`);
  sheet.getRange('D24').setFormula('=ARRAYFORMULA(IF(A24:A="",,IFERROR(C24:C/B24:B,0)))');
  sheet.getRange('E24').setFormula(`=ARRAYFORMULA(IF(A24:A="",,COUNTIFS('${CONFIG.customersSheetName}'!C2:C,A24:A,'${CONFIG.customersSheetName}'!N2:N,"<>",'${CONFIG.customersSheetName}'!N2:N,"<>未入力")))`);
  sheet.getRange('F24').setFormula('=ARRAYFORMULA(IF(A24:A="",,IFERROR(E24:E/C24:C,0)))');
  sheet.getRange('G24').setFormula(`=ARRAYFORMULA(IF(A24:A="",,COUNTIFS('${CONFIG.customersSheetName}'!C2:C,A24:A,'${CONFIG.customersSheetName}'!P2:P,"<>",'${CONFIG.customersSheetName}'!P2:P,"<>未入力")))`);

  formatKpiSheet_(sheet);
}

function createSalespersonCopyPrompt() {
  const ui = SpreadsheetApp.getUi();
  const emailResponse = ui.prompt('担当者コピーを作成', '連携するGoogleカレンダーのメールアドレスを入力してください。', ui.ButtonSet.OK_CANCEL);
  if (emailResponse.getSelectedButton() !== ui.Button.OK) return;

  const email = emailResponse.getResponseText().trim();
  if (!email) return;

  const nameResponse = ui.prompt('担当者名', '担当者名を入力してください。', ui.ButtonSet.OK_CANCEL);
  if (nameResponse.getSelectedButton() !== ui.Button.OK) return;

  const salespersonName = nameResponse.getResponseText().trim() || inferSalespersonName_(email);
  const copied = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId())
    .makeCopy('levela 営業管理システム - ' + salespersonName);

  const copiedSpreadsheet = SpreadsheetApp.openById(copied.getId());
  const setupSheet = copiedSpreadsheet.getSheetByName(CONFIG.setupSheetName);

  setupSheet.getRange(CONFIG.calendarCells[0]).setValue(email);
  setupSheet.getRange(CONFIG.salespersonNameCell).setValue(salespersonName);
  setupSheet.getRange(CONFIG.statusCell).setValue('⏳ コピー作成済み。担当者本人がセットアップしてください');

  ui.alert('担当者コピーを作成しました。\n\n' + copied.getUrl());
}

function ensureSetupSheet_() {
  const sheet = getOrCreateSheet_(CONFIG.setupSheetName);

  if (sheet.getLastRow() > 0 && sheet.getRange('A1').getValue()) return;

  resetSetupSheet_();
}

function resetSetupSheet_() {
  const sheet = getOrCreateSheet_(CONFIG.setupSheetName);
  sheet.clear();

  sheet.getRange('A1:C12').setValues([
    ['levela 営業管理システム — セットアップ', '', ''],
    ['', '', ''],
    ['', 'STEP 1', 'ファイル → コピーを作成 → 自分のGoogleドライブにコピーしてください'],
    ['', '', ''],
    ['', 'STEP 2', 'C7にGoogleカレンダーのメールアドレス、C8に担当者名を入力'],
    ['', '', ''],
    ['', '📧 カレンダーメール', ''],
    ['', '担当者名', ''],
    ['', 'STEP 3', 'メニュー「🔧 levela」→「🔗 カレンダー連携セットアップ」をクリック'],
    ['', 'ステータス', '⏳ 未設定'],
    ['', '', ''],
    ['', '⚠️ 初回実行時に権限確認が表示されます。許可してください。', ''],
  ]);

  sheet.getRange('A1:C1').merge().setFontSize(18).setFontWeight('bold').setBackground('#111827').setFontColor('#FFFFFF');
  sheet.getRange('B3:B10').setFontWeight('bold').setBackground('#E0F2FE');
  sheet.getRange('C7').setBackground('#FEF3C7');
  sheet.getRange('C8').setBackground('#FEF3C7');
  sheet.setColumnWidth(1, 80);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 560);
}

function deleteLegacySheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  CONFIG.legacySheetNames.forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet);
    }
  });
}

function ensureSettingsSheet_() {
  const sheet = getOrCreateSheet_(CONFIG.settingsSheetName);
  sheet.clear();

  const blocks = [
    ['ステータス', OPTIONS.statuses],
    ['流入経路', OPTIONS.sources],
    ['流入', OPTIONS.yesNo],
    ['着席', OPTIONS.statuses],
    ['成約プラン', OPTIONS.plans],
    ['支払方法', OPTIONS.payments],
    ['失注理由', OPTIONS.lostReasons],
    ['保留理由', OPTIONS.holdReasons],
  ];

  blocks.forEach(function(block, i) {
    const col = i + 1;
    sheet.getRange(1, col).setValue(block[0]).setFontWeight('bold').setBackground('#E5E7EB');
    sheet.getRange(2, col, block[1].length, 1).setValues(block[1].map(function(v) { return [v]; }));
  });

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, blocks.length);
}

function ensureGoalsSheet_() {
  const sheet = getOrCreateSheet_(CONFIG.goalsSheetName);

  if (sheet.getLastRow() > 1) return;

  sheet.clear();
  sheet.getRange('A1:C6').setValues([
    ['項目', '目標値', '単位'],
    ['成約数', 25, '件'],
    ['成約率', 41, '%'],
    ['着席率', 80, '%'],
    ['着金成約率', 90, '%'],
    ['成約予定率', 60, '%'],
  ]);

  sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#E5E7EB');
  sheet.autoResizeColumns(1, 3);
}

function ensureTableSheet_(sheetName, headers) {
  const sheet = getOrCreateSheet_(sheetName);
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];

  if (firstRow.join('') === '' || firstRow[0] !== headers[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#111827').setFontColor('#FFFFFF');
  sheet.autoResizeColumns(1, headers.length);
}

function buildCustomerRow_(event, salespersonName, parsed, now, existing) {
  const start = event.getStartTime();
  const eventId = event.getId();
  const old = existing ? existing.values : null;

  function keep(headerName, fallback) {
    if (!old) return fallback;
    const index = CUSTOMER_HEADERS.indexOf(headerName);
    const value = old[index];
    return value === '' || value === null ? fallback : value;
  }

  return [
    keep('顧客ID', makeCustomerId_(eventId)),
    eventId,
    keep('担当者', salespersonName),
    keep('お客様名', parsed.customerName),
    stripTime_(start),
    formatTime_(start),
    keep('セミナー', ''),
    keep('流入経路', '未入力'),
    keep('流入', '未入力'),
    keep('着席', '未入力'),
    keep('成約予定NA', '未入力'),
    keep('着金予定日', ''),
    keep('決着日(着金日)', ''),
    keep('成約プラン', '未入力'),
    keep('支払方法', '未入力'),
    keep('失注理由', '未入力'),
    keep('保留理由', '未入力'),
    keep('失注理由詳細', ''),
    keep('証明動画', ''),
    keep('勉強会参加日', ''),
    keep('Lステ顧客ID', ''),
    now,
    keep('手動メモ', ''),
  ];
}

function upsertCustomerRows_(sheet, existing, rowsById) {
  const allRows = [];
  const used = {};

  Object.keys(existing).forEach(function(eventId) {
    if (rowsById[eventId]) {
      allRows.push(rowsById[eventId]);
      used[eventId] = true;
    } else {
      allRows.push(existing[eventId].values);
    }
  });

  Object.keys(rowsById).forEach(function(eventId) {
    if (!used[eventId]) allRows.push(rowsById[eventId]);
  });

  replaceRows_(sheet, CUSTOMER_HEADERS, allRows);
}

function replaceRows_(sheet, headers, rows) {
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  const filter = sheet.getFilter();
  if (filter) filter.remove();

  sheet.getRange(1, 1, Math.max(rows.length + 1, 2), headers.length).createFilter();

  if (sheet.getName() === CONFIG.customersSheetName) {
    formatCustomerSheetByDay_(sheet, rows.length, headers.length);
  }
}

function clearDataRows_(sheetName, columnCount) {
  const sheet = getOrCreateSheet_(sheetName);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, columnCount).clearContent();
  }

  const filter = sheet.getFilter();
  if (filter) filter.remove();

  sheet.getRange(1, 1, 1, columnCount).createFilter();
}

function readRowsByKey_(sheet, headers, keyHeader) {
  const result = {};

  if (!sheet || sheet.getLastRow() < 2) return result;

  const keyIndex = headers.indexOf(keyHeader);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();

  values.forEach(function(row) {
    const key = row[keyIndex];
    if (key) result[key] = { values: row };
  });

  return result;
}

function formatCustomerSheetByDay_(sheet, rowCount, columnCount) {
  if (rowCount <= 0) return;

  sheet.getRange(2, 1, rowCount, columnCount).sort([
    { column: 5, ascending: true },
    { column: 6, ascending: true },
  ]);

  const values = sheet.getRange(2, 1, rowCount, columnCount).getValues();
  const colors = [];
  let previousDateKey = '';
  let blockIndex = -1;

  values.forEach(function(row, index) {
    const date = row[4];
    const dateKey = date instanceof Date
      ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(date || '');

    if (dateKey !== previousDateKey) {
      blockIndex += 1;
      previousDateKey = dateKey;
      sheet.getRange(index + 2, 1, 1, columnCount)
        .setBorder(true, null, null, null, null, null, '#111827', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }

    const color = blockIndex % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    colors.push(new Array(columnCount).fill(color));
  });

  sheet.getRange(2, 1, rowCount, columnCount).setBackgrounds(colors);
  sheet.getRange(2, 5, rowCount, 1).setNumberFormat('yyyy/mm/dd');
  sheet.getRange(2, 6, rowCount, 1).setNumberFormat('hh:mm');
  sheet.getRange(2, 12, rowCount, 2).setNumberFormat('yyyy/mm/dd');
}

function applyCustomerValidations_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.customersSheetName);
  if (!sheet) return;

  const rows = Math.max(sheet.getMaxRows() - 1, 1);

  setListValidation_(sheet.getRange(2, 8, rows, 1), OPTIONS.sources);
  setListValidation_(sheet.getRange(2, 9, rows, 1), OPTIONS.yesNo);
  setListValidation_(sheet.getRange(2, 10, rows, 1), OPTIONS.statuses);
  setListValidation_(sheet.getRange(2, 11, rows, 1), OPTIONS.yesNo);
  setListValidation_(sheet.getRange(2, 14, rows, 1), OPTIONS.plans);
  setListValidation_(sheet.getRange(2, 15, rows, 1), OPTIONS.payments);
  setListValidation_(sheet.getRange(2, 16, rows, 1), OPTIONS.lostReasons);
  setListValidation_(sheet.getRange(2, 17, rows, 1), OPTIONS.holdReasons);
}

function setListValidation_(range, values) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();

  range.setDataValidation(rule);
}

function eventMatchesSalesperson_(event, salespersonName) {
  const needle = normalizeText_(salespersonName);
  if (!needle) return false;

  const text = normalizeText_((event.getTitle() || '') + '\n' + (event.getDescription() || ''));
  return text.indexOf(needle) !== -1;
}

function parseCustomerFromEvent_(event, salespersonName) {
  const title = event.getTitle() || '';
  const description = event.getDescription() || '';
  const text = removeSalespersonName_(title + '\n' + description, salespersonName);

  const match = text.match(/(?:お客様名|顧客名|氏名|名前)[:：]\s*([^\n\r]+)/);
  const customerName = match ? match[1].trim() : cleanupTitleAsCustomerName_(removeSalespersonName_(title, salespersonName));

  return {
    customerName: customerName,
  };
}

function removeSalespersonName_(text, salespersonName) {
  if (!salespersonName) return text;

  return String(text || '')
    .split(salespersonName).join(' ')
    .replace(/[【】\[\]()（）]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText_(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

function cleanupTitleAsCustomerName_(title) {
  return String(title || '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/【[^】]+】/g, '')
    .replace(/(面談|相談|個別相談|セミナー|説明会|アポ|予約|MTG|meeting)/gi, '')
    .replace(/[-_＿|｜]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '名称未設定';
}

function recreateAutoSyncTrigger_() {
  ScriptApp.getProjectTriggers()
    .filter(function(trigger) {
      return trigger.getHandlerFunction() === CONFIG.triggerFunction;
    })
    .forEach(function(trigger) {
      ScriptApp.deleteTrigger(trigger);
    });

  ScriptApp.newTrigger(CONFIG.triggerFunction)
    .timeBased()
    .everyMinutes(1)
    .create();
}

function getCalendarIdFromSetup_(sheet) {
  for (let i = 0; i < CONFIG.calendarCells.length; i++) {
    const value = String(sheet.getRange(CONFIG.calendarCells[i]).getValue() || '').trim();

    if (value.indexOf('@') > -1) return value;
    if (value.indexOf('group.calendar.google.com') > -1) return value;
  }

  return '';
}

function getSalespersonNameFromSetup_(sheet) {
  return String(sheet.getRange(CONFIG.salespersonNameCell).getValue() || '').trim();
}

function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function formatKpiSheet_(sheet) {
  sheet.getRange('A1:I1').setFontSize(18).setFontWeight('bold').setBackground('#111827').setFontColor('#FFFFFF');
  sheet.getRange('A4:I4').setFontWeight('bold').setBackground('#DBEAFE');
  sheet.getRange('A8:I8').setFontWeight('bold').setBackground('#DBEAFE');
  sheet.getRange('A22:G22').setFontWeight('bold').setBackground('#DBEAFE');

  sheet.getRange('A5:I5').setFontWeight('bold').setBackground('#E5E7EB');
  sheet.getRange('A9:I9').setFontWeight('bold').setBackground('#E5E7EB');
  sheet.getRange('A23:G23').setFontWeight('bold').setBackground('#E5E7EB');

  sheet.getRange('C6:E6').setNumberFormat('0.0%');
  sheet.getRange('D10:D200').setNumberFormat('0.0%');
  sheet.getRange('F10:F200').setNumberFormat('0.0%');
  sheet.getRange('D24:D200').setNumberFormat('0.0%');
  sheet.getRange('F24:F200').setNumberFormat('0.0%');
  sheet.getRange('G24:G200').setNumberFormat('0');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 9);
}

function inferSalespersonName_(calendarId) {
  return String(calendarId).split('@')[0].replace(/[._-]+/g, ' ');
}

function makeCustomerId_(eventId) {
  return 'C-' + String(eventId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
}

function addDays_(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function stripTime_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatTime_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'HH:mm');
}

function formatDateTime_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');
}
