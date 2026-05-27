/*
 * dormswap patch:
 * - C7 = calendar email
 * - C8 = salesperson name
 * - only calendar events containing C8 are synced
 * - customer sheet K:P follows 修正分, keeping L/M as 着金予定日 / 決着日
 * - customer rows are grouped visually by day
 */

const PATCH_SETUP_SHEET = '▶ セットアップ';
const PATCH_APPOINTMENTS_SHEET = 'アポ原本';
const PATCH_CUSTOMERS_SHEET = '顧客管理';
const PATCH_SETTINGS_SHEET = '設定';
const PATCH_KPI_SHEET = 'KPI分析';
const PATCH_GOALS_SHEET = '目標';

const PATCH_APPOINTMENT_HEADERS = [
  'eventId', 'calendarId', '担当者', '開始日時', '終了日時', '日付', '時間',
  'お客様名', '予定タイトル', '説明', '場所', 'ゲストメール', '最終同期日時'
];

const PATCH_CUSTOMER_HEADERS = [
  '顧客ID', 'eventId', '担当者', 'お客様名', '面談日', '面談時間',
  'セミナー', '流入経路', '流入', '着席', '成約予定NA',
  '着金予定日', '決着日(着金日)', '成約プラン', '支払方法', '失注理由',
  '保留理由', '失注理由詳細', '証明動画', '勉強会参加日',
  'Lステ顧客ID', '最終同期日時', '手動メモ'
];

const PATCH_OPTIONS = {
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
    .createMenu('🔧 dormswap')
    .addItem('🔗 カレンダー連携セットアップ', 'setupCalendarIntegration')
    .addItem('🔄 今すぐ同期', 'syncCalendarAppointments')
    .addSeparator()
    .addItem('📊 KPIを再生成', 'rebuildKpiDashboard')
    .addItem('🧱 シート構成を修復', 'ensureWorkbookStructure')
    .addItem('🧼 ひな型化（連携解除）', 'prepareTemplateBase')
    .addToUi();
}

function setupCalendarIntegration() {
  patchEnsureWorkbookStructure_();
  const setup = patchSheet_(PATCH_SETUP_SHEET);
  const calendarId = String(setup.getRange('C7').getValue() || '').trim();
  const salespersonName = String(setup.getRange('C8').getValue() || '').trim();

  if (!calendarId) throw new Error('C7にGoogleカレンダーのメールアドレスを入力してください。');
  if (!salespersonName) throw new Error('C8に担当者名を入力してください。');

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    setup.getRange('C10').setValue('❌ カレンダー取得不可');
    throw new Error('カレンダーを取得できません。メールアドレスまたは共有権限を確認してください。');
  }

  PropertiesService.getDocumentProperties().setProperties({
    calendarId: calendarId,
    salespersonName: salespersonName,
    lastSetupAt: new Date().toISOString(),
  });

  patchRecreateTrigger_();
  syncCalendarAppointments();
}

function syncCalendarAppointments() {
  patchEnsureWorkbookStructure_();

  const props = PropertiesService.getDocumentProperties();
  const setup = patchSheet_(PATCH_SETUP_SHEET);
  const calendarId = props.getProperty('calendarId') || String(setup.getRange('C7').getValue() || '').trim();
  const salespersonName = props.getProperty('salespersonName') || String(setup.getRange('C8').getValue() || '').trim();

  if (!calendarId) {
    setup.getRange('C10').setValue('⏳ 未設定');
    return;
  }
  if (!salespersonName) {
    setup.getRange('C10').setValue('⏳ 担当者名未設定');
    return;
  }

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    setup.getRange('C10').setValue('❌ カレンダー取得不可');
    return;
  }

  const start = patchAddDays_(new Date(), -45);
  const end = patchAddDays_(new Date(), 45);
  const events = calendar.getEvents(start, end);
  const now = new Date();

  const appointmentRows = [];
  const customerRowsById = {};
  const existingCustomers = patchReadRowsByKey_(patchSheet_(PATCH_CUSTOMERS_SHEET), PATCH_CUSTOMER_HEADERS, 'eventId');

  events.forEach(function(event) {
    if (!patchEventMatchesSalesperson_(event, salespersonName)) return;

    const eventId = event.getId();
    const eventStart = event.getStartTime();
    const customerName = patchCustomerNameFromEvent_(event, salespersonName);

    appointmentRows.push([
      eventId,
      calendarId,
      salespersonName,
      event.getStartTime(),
      event.getEndTime(),
      patchStripTime_(eventStart),
      patchFormatTime_(eventStart),
      customerName,
      event.getTitle(),
      event.getDescription(),
      event.getLocation(),
      event.getGuestList().map(function(g) { return g.getEmail(); }).join(', '),
      now
    ]);

    customerRowsById[eventId] = patchBuildCustomerRow_(event, salespersonName, customerName, now, existingCustomers[eventId]);
  });

  patchReplaceRows_(patchSheet_(PATCH_APPOINTMENTS_SHEET), PATCH_APPOINTMENT_HEADERS, appointmentRows);
  patchUpsertCustomerRows_(patchSheet_(PATCH_CUSTOMERS_SHEET), existingCustomers, customerRowsById);
  patchApplyCustomerValidations_();
  rebuildKpiDashboard();

  setup.getRange('C10').setValue('✅ 最終同期: ' + patchFormatDateTime_(now));
  SpreadsheetApp.getActive().toast(appointmentRows.length + '件の予定を同期しました', 'dormswap', 5);
}

function prepareTemplateBase() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'ひな型化しますか？',
    '連携情報、トリガー、アポ原本、顧客管理データを空にします。',
    ui.ButtonSet.OK_CANCEL
  );
  if (response !== ui.Button.OK) return;
  patchResetTemplateBaseNoUi();
}

function patchResetTemplateBaseNoUi() {
  PropertiesService.getDocumentProperties().deleteAllProperties();
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  patchDeleteLegacySheets_();
  patchResetSetupSheet_();
  patchEnsureWorkbookStructure_();
  patchClearDataRows_(PATCH_APPOINTMENTS_SHEET, PATCH_APPOINTMENT_HEADERS.length);
  patchClearDataRows_(PATCH_CUSTOMERS_SHEET, PATCH_CUSTOMER_HEADERS.length);
  patchCleanupExtraCustomerColumns_();
  rebuildKpiDashboard();
}

function patchCleanupFinalNoUi() {
  patchCleanupExtraCustomerColumns_();
}

function patchCleanupExtraCustomerColumns_() {
  const sheet = patchSheet_(PATCH_CUSTOMERS_SHEET);
  const nextColumn = PATCH_CUSTOMER_HEADERS.length + 1;
  const extraColumns = Math.max(sheet.getLastColumn() - PATCH_CUSTOMER_HEADERS.length, 0);
  if (extraColumns > 0) {
    sheet.getRange(1, nextColumn, sheet.getMaxRows(), extraColumns).clearContent().clearDataValidations().clearFormat();
  }
}

function ensureWorkbookStructure() {
  patchEnsureWorkbookStructure_();
}

function rebuildKpiDashboard() {
  const sheet = patchSheet_(PATCH_KPI_SHEET);
  sheet.clear();
  sheet.setHiddenGridlines(true);

  sheet.getRange('A1:I1').merge().setValue('営業 KPI ダッシュボード');
  sheet.getRange('A2').setValue('最終更新');
  sheet.getRange('B2').setValue(new Date());
  sheet.getRange('A4:I4').merge().setValue('▼ 全体サマリー');
  sheet.getRange('A5:I5').setValues([['総アポ数', '着席数', '着席率', '成約数', '成約率(着席比)', '飛び', 'キャンセル', '失注', '保留']]);
  sheet.getRange('A6').setFormula(`=COUNTA('${PATCH_CUSTOMERS_SHEET}'!B2:B)`);
  sheet.getRange('B6').setFormula(`=COUNTIF('${PATCH_CUSTOMERS_SHEET}'!J2:J,"着席")`);
  sheet.getRange('C6').setFormula('=IFERROR(B6/A6,0)');
  sheet.getRange('D6').setFormula(`=COUNTIFS('${PATCH_CUSTOMERS_SHEET}'!N2:N,"<>",'${PATCH_CUSTOMERS_SHEET}'!N2:N,"<>未入力")`);
  sheet.getRange('E6').setFormula('=IFERROR(D6/B6,0)');
  sheet.getRange('F6').setFormula(`=COUNTIF('${PATCH_CUSTOMERS_SHEET}'!J2:J,"飛び")`);
  sheet.getRange('G6').setFormula(`=COUNTIF('${PATCH_CUSTOMERS_SHEET}'!J2:J,"キャンセル")`);
  sheet.getRange('H6').setFormula(`=COUNTIFS('${PATCH_CUSTOMERS_SHEET}'!P2:P,"<>",'${PATCH_CUSTOMERS_SHEET}'!P2:P,"<>未入力")`);
  sheet.getRange('I6').setFormula(`=COUNTIFS('${PATCH_CUSTOMERS_SHEET}'!Q2:Q,"<>",'${PATCH_CUSTOMERS_SHEET}'!Q2:Q,"<>未入力")`);
  sheet.getRange('A1:I1').setFontSize(18).setFontWeight('bold').setBackground('#111827').setFontColor('#FFFFFF');
  sheet.getRange('A4:I5').setFontWeight('bold').setBackground('#E5E7EB');
  sheet.getRange('C6:E6').setNumberFormat('0.0%');
  sheet.autoResizeColumns(1, 9);
}

function patchEnsureWorkbookStructure_() {
  patchEnsureSetupSheet_();
  patchEnsureSettingsSheet_();
  patchEnsureGoalsSheet_();
  patchEnsureTableSheet_(PATCH_APPOINTMENTS_SHEET, PATCH_APPOINTMENT_HEADERS);
  patchEnsureTableSheet_(PATCH_CUSTOMERS_SHEET, PATCH_CUSTOMER_HEADERS);
  patchApplyCustomerValidations_();
}

function patchResetSetupSheet_() {
  const sheet = patchSheet_(PATCH_SETUP_SHEET);
  sheet.clear();
  sheet.getRange('A1:C12').setValues([
    ['dormswap 営業管理システム — セットアップ', '', ''],
    ['', '', ''],
    ['', 'STEP 1', 'ファイル → コピーを作成 → 自分のGoogleドライブにコピーしてください'],
    ['', '', ''],
    ['', 'STEP 2', 'C7にGoogleカレンダーのメールアドレス、C8に担当者名を入力'],
    ['', '', ''],
    ['', '📧 カレンダーメール', ''],
    ['', '担当者名', ''],
    ['', 'STEP 3', 'メニュー「🔧 dormswap」→「🔗 カレンダー連携セットアップ」をクリック'],
    ['', 'ステータス', '⏳ 未設定'],
    ['', '', ''],
    ['', '⚠️ 初回実行時に権限確認が表示されます。許可してください。', ''],
  ]);
  sheet.getRange('A1:C1').merge().setFontSize(18).setFontWeight('bold').setBackground('#111827').setFontColor('#FFFFFF');
  sheet.getRange('B3:B10').setFontWeight('bold').setBackground('#E0F2FE');
  sheet.getRange('C7:C8').setBackground('#FEF3C7');
  sheet.setColumnWidth(1, 80);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 560);
}

function patchEnsureSetupSheet_() {
  const sheet = patchSheet_(PATCH_SETUP_SHEET);
  if (sheet.getLastRow() === 0 || !sheet.getRange('A1').getValue()) patchResetSetupSheet_();
}

function patchEnsureSettingsSheet_() {
  const sheet = patchSheet_(PATCH_SETTINGS_SHEET);
  sheet.clear();
  const blocks = [
    ['ステータス', PATCH_OPTIONS.statuses],
    ['流入経路', PATCH_OPTIONS.sources],
    ['流入', PATCH_OPTIONS.yesNo],
    ['着席', PATCH_OPTIONS.statuses],
    ['成約予定NA', PATCH_OPTIONS.yesNo],
    ['成約プラン', PATCH_OPTIONS.plans],
    ['支払方法', PATCH_OPTIONS.payments],
    ['失注理由', PATCH_OPTIONS.lostReasons],
    ['保留理由', PATCH_OPTIONS.holdReasons],
  ];
  blocks.forEach(function(block, i) {
    const col = i + 1;
    sheet.getRange(1, col).setValue(block[0]).setFontWeight('bold').setBackground('#E5E7EB');
    sheet.getRange(2, col, block[1].length, 1).setValues(block[1].map(function(v) { return [v]; }));
  });
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, blocks.length);
}

function patchEnsureGoalsSheet_() {
  const sheet = patchSheet_(PATCH_GOALS_SHEET);
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
}

function patchEnsureTableSheet_(sheetName, headers) {
  const sheet = patchSheet_(sheetName);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#111827').setFontColor('#FFFFFF');
  sheet.autoResizeColumns(1, headers.length);
}

function patchBuildCustomerRow_(event, salespersonName, customerName, now, existing) {
  const old = existing ? existing.values : null;
  const start = event.getStartTime();
  function keep(headerName, fallback) {
    if (!old) return fallback;
    const index = PATCH_CUSTOMER_HEADERS.indexOf(headerName);
    const value = old[index];
    return value === '' || value === null ? fallback : value;
  }
  return [
    keep('顧客ID', 'C-' + String(event.getId()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)),
    event.getId(),
    salespersonName,
    customerName,
    patchStripTime_(start),
    patchFormatTime_(start),
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

function patchUpsertCustomerRows_(sheet, existing, rowsById) {
  const rows = [];
  const used = {};
  Object.keys(existing).forEach(function(id) {
    if (rowsById[id]) {
      rows.push(rowsById[id]);
      used[id] = true;
    } else {
      rows.push(existing[id].values.slice(0, PATCH_CUSTOMER_HEADERS.length));
    }
  });
  Object.keys(rowsById).forEach(function(id) {
    if (!used[id]) rows.push(rowsById[id]);
  });
  patchReplaceRows_(sheet, PATCH_CUSTOMER_HEADERS, rows);
}

function patchReplaceRows_(sheet, headers, rows) {
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  const filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.getRange(1, 1, Math.max(rows.length + 1, 2), headers.length).createFilter();
  if (sheet.getName() === PATCH_CUSTOMERS_SHEET) patchFormatCustomerByDay_(sheet, rows.length, headers.length);
}

function patchClearDataRows_(sheetName, columnCount) {
  const sheet = patchSheet_(sheetName);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), columnCount)).clearContent();
  const filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.getRange(1, 1, 1, columnCount).createFilter();
}

function patchFormatCustomerByDay_(sheet, rowCount, columnCount) {
  if (rowCount <= 0) return;
  sheet.getRange(2, 1, rowCount, columnCount).sort([{ column: 5, ascending: true }, { column: 6, ascending: true }]);
  const values = sheet.getRange(2, 1, rowCount, columnCount).getValues();
  const colors = [];
  let previous = '';
  let block = -1;
  values.forEach(function(row, index) {
    const key = row[4] instanceof Date ? Utilities.formatDate(row[4], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[4] || '');
    if (key !== previous) {
      previous = key;
      block += 1;
      sheet.getRange(index + 2, 1, 1, columnCount).setBorder(true, null, null, null, null, null, '#111827', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }
    colors.push(new Array(columnCount).fill(block % 2 === 0 ? '#FFFFFF' : '#F8FAFC'));
  });
  sheet.getRange(2, 1, rowCount, columnCount).setBackgrounds(colors);
  sheet.getRange(2, 5, rowCount, 1).setNumberFormat('yyyy/mm/dd');
  sheet.getRange(2, 6, rowCount, 1).setNumberFormat('hh:mm');
  sheet.getRange(2, 12, rowCount, 2).setNumberFormat('yyyy/mm/dd');
}

function patchApplyCustomerValidations_() {
  const sheet = patchSheet_(PATCH_CUSTOMERS_SHEET);
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  patchSetValidation_(sheet.getRange(2, 8, rows, 1), PATCH_OPTIONS.sources);
  patchSetValidation_(sheet.getRange(2, 9, rows, 1), PATCH_OPTIONS.yesNo);
  patchSetValidation_(sheet.getRange(2, 10, rows, 1), PATCH_OPTIONS.statuses);
  patchSetValidation_(sheet.getRange(2, 11, rows, 1), PATCH_OPTIONS.yesNo);
  patchSetValidation_(sheet.getRange(2, 14, rows, 1), PATCH_OPTIONS.plans);
  patchSetValidation_(sheet.getRange(2, 15, rows, 1), PATCH_OPTIONS.payments);
  patchSetValidation_(sheet.getRange(2, 16, rows, 1), PATCH_OPTIONS.lostReasons);
  patchSetValidation_(sheet.getRange(2, 17, rows, 1), PATCH_OPTIONS.holdReasons);
}

function patchSetValidation_(range, values) {
  range.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build());
}

function patchReadRowsByKey_(sheet, headers, keyHeader) {
  const result = {};
  if (!sheet || sheet.getLastRow() < 2) return result;
  const keyIndex = headers.indexOf(keyHeader);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.min(sheet.getLastColumn(), headers.length)).getValues();
  values.forEach(function(row) {
    const key = row[keyIndex];
    if (key) result[key] = { values: row };
  });
  return result;
}

function patchEventMatchesSalesperson_(event, salespersonName) {
  const needle = patchNormalize_(salespersonName);
  const haystack = patchNormalize_((event.getTitle() || '') + '\n' + (event.getDescription() || ''));
  return !!needle && haystack.indexOf(needle) !== -1;
}

function patchCustomerNameFromEvent_(event, salespersonName) {
  const title = patchRemoveSalesperson_(event.getTitle() || '', salespersonName);
  const description = patchRemoveSalesperson_(event.getDescription() || '', salespersonName);
  const match = (title + '\n' + description).match(/(?:お客様名|顧客名|氏名|名前)[:：]\s*([^\n\r]+)/);
  if (match) return patchCleanCustomerName_(match[1]);
  return patchCleanCustomerName_(title);
}

function patchRemoveSalesperson_(text, salespersonName) {
  return String(text || '').split(salespersonName).join(' ');
}

function patchCleanCustomerName_(text) {
  return String(text || '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/【[^】]+】/g, '')
    .replace(/(面談|相談|個別相談|セミナー|説明会|アポ|予約|MTG|meeting|zoom|Zoom)/gi, '')
    .replace(/[【】\[\]()（）]/g, ' ')
    .replace(/[-_＿|｜]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '名称未設定';
}

function patchNormalize_(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, '').trim();
}

function patchRecreateTrigger_() {
  ScriptApp.getProjectTriggers()
    .filter(function(trigger) { return trigger.getHandlerFunction() === 'syncCalendarAppointments'; })
    .forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('syncCalendarAppointments').timeBased().everyMinutes(1).create();
}

function patchDeleteLegacySheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ['シート1', 'シート2'].forEach(function(name) {
    const sheet = ss.getSheetByName(name);
    if (sheet && ss.getSheets().length > 1) ss.deleteSheet(sheet);
  });
}

function patchSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function patchAddDays_(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function patchStripTime_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function patchFormatTime_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'HH:mm');
}

function patchFormatDateTime_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');
}
