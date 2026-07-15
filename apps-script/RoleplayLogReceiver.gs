const ROLEPLAY_LOG_SHEET_NAME = 'ロープレ実施記録';
const ROLEPLAY_LOG_HEADERS = [
  'ID',
  '登録日時',
  '実施日',
  '営業役',
  'お客さん役',
  '実施範囲ID',
  '実施範囲',
  'メモ',
  'ペアID',
  'ペア種別',
];

function doPost(e) {
  const payload = parseRoleplayLogPayload_(e);
  const auth = authorizeRoleplayLog_(payload.secret);

  if (!auth.ok) {
    return createRoleplayLogJson_({ ok: false, error: 'Unauthorized' });
  }

  const records = Array.isArray(payload.records) ? payload.records : [];

  if (!records.length) {
    return createRoleplayLogJson_({ ok: false, error: 'No records' });
  }

  const sheet = getRoleplayLogSheet_();
  const rows = records.map(function(record) {
    const scopes = normalizeRoleplayLogScopes_(record.scopes || record.scope);
    const scopeLabels = normalizeRoleplayLogScopeLabels_(record.scopeLabels || record.scopeLabel);
    return [
      normalizeRoleplayLogText_(record.id),
      normalizeRoleplayLogText_(record.submittedAt),
      normalizeRoleplayLogText_(record.sessionDate),
      normalizeRoleplayLogText_(record.sellerName),
      normalizeRoleplayLogText_(record.customerName),
      scopes.join(','),
      scopeLabels.join(' / '),
      normalizeRoleplayLogText_(record.note),
      normalizeRoleplayLogText_(record.pairSessionId),
      normalizeRoleplayLogText_(record.pairDirection),
    ];
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ROLEPLAY_LOG_HEADERS.length).setValues(rows);

  return createRoleplayLogJson_({ ok: true, count: rows.length });
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const auth = authorizeRoleplayLog_(params.secret);

  if (!auth.ok) {
    return createRoleplayLogJson_({ ok: false, error: 'Unauthorized' });
  }

  const from = normalizeRoleplayLogText_(params.from);
  const to = normalizeRoleplayLogText_(params.to);
  const sheet = getRoleplayLogSheet_();
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return createRoleplayLogJson_({ ok: true, records: [] });
  }

  const records = values.slice(1).map(function(row) {
    return {
      id: normalizeRoleplayLogText_(row[0]),
      submittedAt: normalizeRoleplayLogText_(row[1]),
      sessionDate: formatRoleplayLogDate_(row[2]),
      sellerName: normalizeRoleplayLogText_(row[3]),
      customerName: normalizeRoleplayLogText_(row[4]),
      scope: normalizeRoleplayLogText_(row[5]),
      scopeLabel: normalizeRoleplayLogText_(row[6]),
      scopes: normalizeRoleplayLogScopes_(row[5]),
      scopeLabels: normalizeRoleplayLogScopeLabels_(row[6]),
      note: normalizeRoleplayLogText_(row[7]),
      pairSessionId: normalizeRoleplayLogText_(row[8]),
      pairDirection: normalizeRoleplayLogText_(row[9]),
    };
  }).filter(function(record) {
    if (from && record.sessionDate < from) return false;
    if (to && record.sessionDate > to) return false;
    return true;
  });

  return createRoleplayLogJson_({ ok: true, records: records });
}

function getRoleplayLogSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(ROLEPLAY_LOG_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(ROLEPLAY_LOG_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(ROLEPLAY_LOG_HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function authorizeRoleplayLog_(secret) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('ROLEPLAY_LOG_SHEET_SECRET') || '';
  return { ok: !expectedSecret || secret === expectedSecret };
}

function parseRoleplayLogPayload_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return {};
  }
}

function normalizeRoleplayLogText_(value) {
  return String(value || '').trim();
}

function normalizeRoleplayLogScopes_(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeRoleplayLogText_).filter(Boolean);
  }

  return normalizeRoleplayLogText_(value).split(',').map(normalizeRoleplayLogText_).filter(Boolean);
}

function normalizeRoleplayLogScopeLabels_(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeRoleplayLogText_).filter(Boolean);
  }

  return normalizeRoleplayLogText_(value).split('/').map(normalizeRoleplayLogText_).filter(Boolean);
}

function formatRoleplayLogDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return normalizeRoleplayLogText_(value);
}

function createRoleplayLogJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
