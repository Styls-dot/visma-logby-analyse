/**
 * Sheet.gs — Hjælpefunktioner til at skrive til Google Sheet.
 * Idempotente: kalder kan trygt køre dem flere gange.
 */

/** Returnerer fanen ved navn, opretter den hvis den ikke findes. */
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Rydder en fane og skriver headers + rows på ny.
 * Bruges til snapshot-faner (Overblik, Kampagner, Annoncesæt, Annoncer, Anbefalinger).
 *
 * @param {string} sheetName
 * @param {string[]} headers
 * @param {Array<Array<*>>} rows
 */
function clearAndWrite(sheetName, headers, rows) {
  const sheet = getOrCreateSheet(sheetName);
  sheet.clear();

  if (headers && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
  }

  if (rows && rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  } else {
    sheet.getRange(2, 1).setValue('Ingen data for denne periode.');
  }

  sheet.autoResizeColumns(1, headers.length);
}

/**
 * Tilføjer rækker nederst i en fane (uden at røre eksisterende data).
 * Hvis fanen er tom skrives headers først.
 *
 * @param {string} sheetName
 * @param {string[]} headers
 * @param {Array<Array<*>>} rows
 */
function appendRows(sheetName, headers, rows) {
  const sheet = getOrCreateSheet(sheetName);

  if (sheet.getLastRow() === 0 && headers) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
  }

  if (rows && rows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/**
 * Skriver KPI-kort til Overblik-fanen.
 * Layout: 4 kort i række 4-5, og 4 CPA-kort i række 7-8.
 */
function writeOverviewCards(kpis) {
  const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.OVERVIEW);
  sheet.clear();

  sheet.getRange('A1').setValue('Altid Energi — Meta Dashboard')
    .setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Senest opdateret: ' + new Date().toLocaleString('da-DK'))
    .setFontStyle('italic').setFontColor('#666');

  const spendCards = [
    { label: 'Spend i dag *', value: kpis.spend_today, format: '#,##0 kr' },
    { label: 'Spend i går', value: kpis.spend_yesterday, format: '#,##0 kr' },
    { label: 'Spend sidste 7 dage', value: kpis.spend_7d, format: '#,##0 kr' },
    { label: 'Spend sidste 30 dage', value: kpis.spend_30d, format: '#,##0 kr' }
  ];

  spendCards.forEach((card, i) => {
    const col = 1 + i * 2;
    sheet.getRange(4, col).setValue(card.label).setFontWeight('bold');
    sheet.getRange(5, col).setValue(card.value).setNumberFormat(card.format).setFontSize(18);
  });

  const cpaCards = [
    { label: 'CPA i dag *', value: kpis.cpa_today, format: '#,##0 kr' },
    { label: 'CPA i går', value: kpis.cpa_yesterday, format: '#,##0 kr' },
    { label: 'CPA sidste 7 dage', value: kpis.cpa_7d, format: '#,##0 kr' },
    { label: 'CPA sidste 30 dage', value: kpis.cpa_30d, format: '#,##0 kr' }
  ];

  cpaCards.forEach((card, i) => {
    const col = 1 + i * 2;
    sheet.getRange(7, col).setValue(card.label).setFontWeight('bold');
    sheet.getRange(8, col).setValue(card.value).setNumberFormat(card.format).setFontSize(18);
  });

  sheet.getRange('A10').setValue('* = stadig i bevægelse (dagen er ikke slut)')
    .setFontStyle('italic').setFontColor('#999');

  sheet.setColumnWidths(1, 8, 130);
}

/** Viser en toast-notifikation i bunden af brugerens browser. */
function showToast(message, title) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title || 'Meta Dashboard', 5);
}
