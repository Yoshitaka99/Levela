const ORO_SOURCE_SPREADSHEET_ID = '1kkL_gysoXKq0Kh8ttFeMmG6pljzv1iwum2k2DxvJ96s';
const ORO_SOURCE_SHEET_ID = 2051214579;
const ORO_SOURCE_SHEET_NAME = '';
const ORO_TARGET_SEMINAR_TEXT = '5月セミナー';
const ORO_TARGET_MEMBERS = [
  '和佐田舞緒',
  '関口愛里',
  '田仲由敬',
  '早川大貴',
  '河上まちこ',
  '加藤陸',
  '持木玲那',
  '笠松佑衣',
  '五十嵐凌大',
  '苙隼人',
];

function doGet() {
  const data = buildOroTeamDashboardPayload_();
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildOroTeamDashboardPayload_() {
  const rows = getSourceRows_();
  const memberRows = ORO_TARGET_MEMBERS.reduce((grouped, member) => {
    grouped[member] = rows.filter((row) => row.member === member);
    return grouped;
  }, {});

  const members = ORO_TARGET_MEMBERS.map((member) => {
    const items = memberRows[member] || [];
    const seatedRows = items.filter((row) => row.seated);
    const closedRows = items.filter((row) => isClosedStatus_(row.status));
    const pendingRows = items.filter((row) => isPendingStatus_(row.status));
    const holdRows = items.filter((row) => row.status === '保留');
    const alertRows = closedRows.filter((row) => !row.paymentDate);
    const lostReasons = aggregateByField_(items, 'lostReason');
    const holdReasons = aggregateByField_(items, 'holdReason');

    return {
      name: member,
      leads: items.length,
      seated: seatedRows.length,
      seatRate: rate_(seatedRows.length, items.length),
      closed: closedRows.length,
      closeRate: rate_(closedRows.length, seatedRows.length),
      pending: pendingRows.length,
      projected: closedRows.length + pendingRows.length,
      projectedRate: rate_(closedRows.length + pendingRows.length, seatedRows.length),
      hold: holdRows.length,
      alert: alertRows.length,
      lostReasons,
      holdReasons,
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    source: 'sheet',
    members,
    lostReasons: aggregateByField_(rows, 'lostReason'),
    holdReasons: aggregateByField_(rows, 'holdReason'),
    statusMix: aggregateStatus_(rows),
  };
}

function getSourceRows_() {
  const ss = SpreadsheetApp.openById(ORO_SOURCE_SPREADSHEET_ID);
  const sheet = ORO_SOURCE_SHEET_NAME
    ? ss.getSheetByName(ORO_SOURCE_SHEET_NAME)
    : ss.getSheets().find((candidate) => candidate.getSheetId() === ORO_SOURCE_SHEET_ID) || ss.getSheets()[0];
  if (!sheet) return [];

  const values = sheet.getDataRange().getDisplayValues();
  values.shift();

  return values
    .map((row) => ({
      customer: String(row[0] || '').trim(),
      member: String(row[1] || '').trim(),
      seminar: String(row[2] || '').trim(),
      seated: String(row[6] || '').trim() === '着座',
      status: String(row[7] || '').trim(),
      paymentDate: String(row[13] || '').trim(),
      lostReason: String(row[16] || '').trim(),
      holdReason: String(row[17] || row[19] || '').trim(),
    }))
    .filter((row) =>
      ORO_TARGET_MEMBERS.includes(row.member) &&
      row.seminar.indexOf(ORO_TARGET_SEMINAR_TEXT) !== -1
    );
}

function isClosedStatus_(status) {
  return Boolean(status) && String(status).trim().endsWith('成約');
}

function isPendingStatus_(status) {
  const value = String(status || '').trim();
  return value.indexOf('成約予定') !== -1 &&
    value.indexOf('失注') === -1 &&
    !value.endsWith('成約');
}

function aggregateByField_(rows, fieldName) {
  const totals = rows.reduce((grouped, row) => {
    const label = String(row[fieldName] || '').trim();
    if (!label) return grouped;
    grouped[label] = (grouped[label] || 0) + 1;
    return grouped;
  }, {});

  return Object.keys(totals)
    .map((label) => ({ label, count: totals[label] }))
    .sort((a, b) => b.count - a.count);
}

function aggregateStatus_(rows) {
  const totals = rows.reduce((grouped, row) => {
    const label = String(row.status || '').trim();
    if (!label) return grouped;
    grouped[label] = (grouped[label] || 0) + 1;
    return grouped;
  }, {});
  const total = rows.length || 1;

  return Object.keys(totals)
    .map((label) => ({
      label,
      count: totals[label],
      rate: rate_(totals[label], total),
    }))
    .sort((a, b) => b.count - a.count);
}

function rate_(numerator, denominator) {
  return denominator ? (numerator / denominator) * 100 : 0;
}
