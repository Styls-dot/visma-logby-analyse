/**
 * Setup.gs — Førstegangs-setup wizard og custom menu.
 */

/** Apps Script kalder automatisk denne ved Sheet-åbning. Tilføjer custom menu. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Meta Dashboard')
    .addItem('🔧 Setup (første gang)', 'setup')
    .addSeparator()
    .addItem('🔄 Opdater nu', 'runNow')
    .addItem('📜 Vis log', 'showLog')
    .addItem('🗑️ Nulstil setup', 'resetSetup')
    .addToUi();
}

/** Setup-wizard. Kører ved første brug. */
function setup() {
  const ui = SpreadsheetApp.getUi();

  // Trin 1: Token
  const tokenResp = ui.prompt(
    'Setup 1/2 — Meta Access Token',
    'Indsæt din Meta system user access token (fra business.facebook.com → Business Settings → System Users):',
    ui.ButtonSet.OK_CANCEL
  );
  if (tokenResp.getSelectedButton() !== ui.Button.OK) return;
  const token = tokenResp.getResponseText().trim();
  if (!token) {
    ui.alert('Fejl', 'Token må ikke være tom.', ui.ButtonSet.OK);
    return;
  }

  // Trin 2: Account ID
  const accountResp = ui.prompt(
    'Setup 2/2 — Ad Account ID',
    'Indsæt din Ad Account ID (format: act_XXXXXXXXX). Findes i Ads Manager URL\'en.',
    ui.ButtonSet.OK_CANCEL
  );
  if (accountResp.getSelectedButton() !== ui.Button.OK) return;
  let accountId = accountResp.getResponseText().trim();
  if (!accountId) {
    ui.alert('Fejl', 'Account ID må ikke være tom.', ui.ButtonSet.OK);
    return;
  }
  // Tilføj 'act_' hvis det mangler
  if (!accountId.startsWith('act_')) {
    accountId = 'act_' + accountId.replace(/[^0-9]/g, '');
  }

  // Validér via test-kald
  showToast('Validerer token mod Meta API...');
  const test = MetaAPI.testToken(token, accountId);
  if (!test.ok) {
    ui.alert(
      'Validering fejlede',
      `Meta afviste forespørgslen:\n\n${test.error}\n\nTjek at token og Account ID er korrekte og prøv igen.`,
      ui.ButtonSet.OK
    );
    return;
  }

  // Gem
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.PROPERTY_KEYS.META_TOKEN, token);
  props.setProperty(CONFIG.PROPERTY_KEYS.AD_ACCOUNT_ID, accountId);
  props.setProperty(CONFIG.PROPERTY_KEYS.NOTIFY_EMAIL, Session.getActiveUser().getEmail() || '');

  // Opret trigger
  _ensureTrigger();

  // Første kørsel
  ui.alert(
    'Setup klar! ✅',
    `Forbundet til "${test.accountName}".\n\n` +
    `Trigger oprettet — kører dagligt kl. ${CONFIG.TRIGGER_HOUR}:00.\n\n` +
    `Klikker du OK kører jeg første dataindlæsning nu (kan tage 30-60 sek).`,
    ui.ButtonSet.OK
  );

  try {
    dailyRun();
    ui.alert('Færdig! 🎉', 'Tjek "📊 Overblik"-fanen.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Første kørsel fejlede', e.message + '\n\nTjek "⚙️ Log"-fanen for detaljer.', ui.ButtonSet.OK);
  }
}

function _ensureTrigger() {
  // Slet eksisterende dailyRun-triggers så vi ikke duplikerer
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'dailyRun') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('dailyRun')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.TRIGGER_HOUR)
    .inTimezone(CONFIG.TIMEZONE)
    .create();
}

function runNow() {
  showToast('Henter friske tal...');
  try {
    dailyRun();
    showToast('Færdig ✅');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Fejl under kørsel', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function showLog() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (sheet) sheet.activate();
}

function resetSetup() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    'Nulstil setup?',
    'Dette sletter token og Account ID fra Properties (Sheet-data bevares). Du skal køre Setup igen efter.',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;
  const props = PropertiesService.getScriptProperties();
  Object.values(CONFIG.PROPERTY_KEYS).forEach(key => props.deleteProperty(key));
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'dailyRun') ScriptApp.deleteTrigger(t);
  });
  ui.alert('Nulstillet. Kør Setup igen for at genaktivere.');
}
