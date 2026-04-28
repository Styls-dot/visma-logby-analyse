/**
 * Main.gs — Daglig kørsel orchestration.
 * Kaldes af tids-trigger eller manuelt via menu.
 */

/** Top-level entry point. Kører hele dashboard-opdateringen. */
function dailyRun() {
  const start = new Date();
  let rowCount = 0;

  try {
    const props = PropertiesService.getScriptProperties();
    const accountId = props.getProperty(CONFIG.PROPERTY_KEYS.AD_ACCOUNT_ID);
    if (!accountId) throw new Error('Ad Account ID mangler. Kør Setup fra menuen.');

    // 1. Hent konto-niveau insights for 4 perioder
    const acctToday = MetaAPI.fetchAccountInsights(accountId, 'today');
    const acctYesterday = MetaAPI.fetchAccountInsights(accountId, 'yesterday');
    const acct7d = MetaAPI.fetchAccountInsights(accountId, 'last_7d');
    const acct30d = MetaAPI.fetchAccountInsights(accountId, 'last_30d');

    // 2. Skriv Overblik-fane
    const kpis = {
      spend_today: parseFloat((acctToday && acctToday.spend) || 0),
      spend_yesterday: parseFloat((acctYesterday && acctYesterday.spend) || 0),
      spend_7d: parseFloat((acct7d && acct7d.spend) || 0),
      spend_30d: parseFloat((acct30d && acct30d.spend) || 0),
      cpa_today: _calcCpa(acctToday),
      cpa_yesterday: _calcCpa(acctYesterday),
      cpa_7d: _calcCpa(acct7d),
      cpa_30d: _calcCpa(acct30d)
    };
    writeOverviewCards(kpis);
    rowCount += 1;

    // 3. Hent alle 3 niveauer (én API-kald hver, alle tidsperioder via aliaser)
    const campaigns = MetaAPI.fetchCampaigns(accountId);
    const adSets = MetaAPI.fetchAdSets(accountId);
    const ads = MetaAPI.fetchAds(accountId);

    // 4. Beregn afledte tal og normaliser
    const campaignsNorm = campaigns.map(c => _normalizeItem(c, 'campaign'));
    const adSetsNorm = adSets.map(a => _normalizeItem(a, 'adset'));
    const adsNorm = ads.map(a => _normalizeItem(a, 'ad'));

    // 5. Konto-gennemsnits-CPA (vægtet på spend, fra annoncesæt-niveau)
    const accountAvgCpa = _weightedAvgCpa(adSetsNorm);

    // 6. Skriv snapshot-faner
    _writeCampaigns(campaignsNorm);
    rowCount += campaignsNorm.length;
    _writeAdSets(adSetsNorm);
    rowCount += adSetsNorm.length;
    _writeAds(adsNorm);
    rowCount += adsNorm.length;

    // 7. Anbefalinger
    const recs = Rules.generateAll(accountAvgCpa, campaignsNorm, adSetsNorm, adsNorm);
    clearAndWrite(
      CONFIG.SHEET_NAMES.RECOMMENDATIONS,
      ['Prioritet', 'Niveau', 'Navn', 'Problem', 'Foreslået handling'],
      recs
    );
    rowCount += recs.length;

    // 8. Append til Historik
    _appendHistory(kpis, campaignsNorm, adSetsNorm, adsNorm);

    // 9. Log success
    _logRun('OK', start, rowCount, null);

  } catch (err) {
    _logRun('FEJL', start, rowCount, err.message);
    _notifyError(err);
    throw err; // Re-throw så Apps Script logger det i Stackdriver
  }
}

function _calcCpa(insights) {
  if (!insights) return 0;
  const spend = parseFloat(insights.spend || 0);
  const purchases = MetaAPI.extractPurchases(insights);
  if (purchases === 0) return 0;
  return spend / purchases;
}

function _normalizeItem(item, level) {
  const ins7d = (item.insights && item.insights.data && item.insights.data[0]) || null;
  const ins30d = (item.insights_30d && item.insights_30d.data && item.insights_30d.data[0]) || null;
  const insToday = (item.insights_today && item.insights_today.data && item.insights_today.data[0]) || null;

  return {
    id: item.id,
    name: item.name,
    status: item.status,
    effective_status: item.effective_status,
    objective: item.objective || '',
    parent_id: item.campaign_id || item.adset_id || '',
    thumbnail_url: (item.creative && item.creative.thumbnail_url) || '',

    // 7d metrics
    spend_7d: parseFloat((ins7d && ins7d.spend) || 0),
    impressions_7d: parseInt((ins7d && ins7d.impressions) || 0),
    clicks_7d: parseInt((ins7d && ins7d.clicks) || 0),
    ctr_7d: parseFloat((ins7d && ins7d.ctr) || 0),
    cpm_7d: parseFloat((ins7d && ins7d.cpm) || 0),
    cpc_7d: parseFloat((ins7d && ins7d.cpc) || 0),
    frequency_7d: parseFloat((ins7d && ins7d.frequency) || 0),
    reach_7d: parseInt((ins7d && ins7d.reach) || 0),
    purchases_7d: MetaAPI.extractPurchases(ins7d),
    cpa_7d: ins7d ? _calcCpa(ins7d) : 0,

    // 30d metrics
    spend_30d: parseFloat((ins30d && ins30d.spend) || 0),
    purchases_30d: MetaAPI.extractPurchases(ins30d),
    cpa_30d: ins30d ? _calcCpa(ins30d) : 0,

    // Today metrics (for at regler som "spend spike" og "paused but spending" virker per-item)
    spend_today: parseFloat((insToday && insToday.spend) || 0),
    purchases_today: MetaAPI.extractPurchases(insToday)
  };
}

function _weightedAvgCpa(items) {
  let totalSpend = 0;
  let totalPurchases = 0;
  items.forEach(i => {
    totalSpend += i.spend_7d;
    totalPurchases += i.purchases_7d;
  });
  return totalPurchases > 0 ? totalSpend / totalPurchases : 0;
}

function _writeCampaigns(campaigns) {
  const headers = ['ID', 'Navn', 'Status', 'Objective',
    'Spend 7d', 'Purchases 7d', 'CPA 7d',
    'Spend 30d', 'Purchases 30d', 'CPA 30d',
    'CPM 7d', 'CTR 7d %', 'Frequency 7d'];
  const rows = campaigns.map(c => [
    c.id, c.name, c.effective_status, c.objective,
    Math.round(c.spend_7d), c.purchases_7d, Math.round(c.cpa_7d),
    Math.round(c.spend_30d), c.purchases_30d, Math.round(c.cpa_30d),
    Math.round(c.cpm_7d), c.ctr_7d.toFixed(2), c.frequency_7d.toFixed(1)
  ]);
  clearAndWrite(CONFIG.SHEET_NAMES.CAMPAIGNS, headers, rows);
}

function _writeAdSets(adSets) {
  const headers = ['ID', 'Navn', 'Status', 'Kampagne-ID',
    'Spend 7d', 'Purchases 7d', 'CPA 7d',
    'Spend 30d', 'Purchases 30d', 'CPA 30d',
    'CPM 7d', 'CTR 7d %', 'Frequency 7d'];
  const rows = adSets.map(a => [
    a.id, a.name, a.effective_status, a.parent_id,
    Math.round(a.spend_7d), a.purchases_7d, Math.round(a.cpa_7d),
    Math.round(a.spend_30d), a.purchases_30d, Math.round(a.cpa_30d),
    Math.round(a.cpm_7d), a.ctr_7d.toFixed(2), a.frequency_7d.toFixed(1)
  ]);
  clearAndWrite(CONFIG.SHEET_NAMES.AD_SETS, headers, rows);
}

function _writeAds(ads) {
  const headers = ['ID', 'Navn', 'Status', 'Annoncesæt-ID', 'Thumbnail',
    'Spend 7d', 'Purchases 7d', 'CPA 7d',
    'Spend 30d', 'Purchases 30d', 'CPA 30d',
    'CPM 7d', 'CTR 7d %', 'Frequency 7d'];
  const rows = ads.map(a => [
    a.id, a.name, a.effective_status, a.parent_id,
    a.thumbnail_url ? `=HYPERLINK("${a.thumbnail_url}";"vis")` : '',
    Math.round(a.spend_7d), a.purchases_7d, Math.round(a.cpa_7d),
    Math.round(a.spend_30d), a.purchases_30d, Math.round(a.cpa_30d),
    Math.round(a.cpm_7d), a.ctr_7d.toFixed(2), a.frequency_7d.toFixed(1)
  ]);
  clearAndWrite(CONFIG.SHEET_NAMES.ADS, headers, rows);
}

function _appendHistory(kpis, campaigns, adSets, ads) {
  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const headers = ['Dato', 'Niveau', 'ID', 'Navn', 'Spend 7d', 'Purchases 7d', 'CPA 7d'];

  const rows = [
    [today, 'Konto', '-', 'Konto-total', Math.round(kpis.spend_7d), '', Math.round(kpis.cpa_7d)]
  ];
  campaigns.forEach(c => rows.push([today, 'Kampagne', c.id, c.name, Math.round(c.spend_7d), c.purchases_7d, Math.round(c.cpa_7d)]));
  adSets.forEach(a => rows.push([today, 'Annoncesæt', a.id, a.name, Math.round(a.spend_7d), a.purchases_7d, Math.round(a.cpa_7d)]));
  ads.forEach(a => rows.push([today, 'Annonce', a.id, a.name, Math.round(a.spend_7d), a.purchases_7d, Math.round(a.cpa_7d)]));

  appendRows(CONFIG.SHEET_NAMES.HISTORY, headers, rows);
}

function _logRun(status, startTime, rowCount, errorMsg) {
  const duration = Math.round((new Date() - startTime) / 1000);
  appendRows(
    CONFIG.SHEET_NAMES.LOG,
    ['Tidsstempel', 'Status', 'Varighed (s)', 'Antal rækker', 'Fejl'],
    [[
      Utilities.formatDate(startTime, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      status,
      duration,
      rowCount,
      errorMsg || ''
    ]]
  );
}

function _notifyError(err) {
  try {
    const props = PropertiesService.getScriptProperties();
    const email = props.getProperty(CONFIG.PROPERTY_KEYS.NOTIFY_EMAIL) || Session.getActiveUser().getEmail();
    if (!email) return;
    MailApp.sendEmail({
      to: email,
      subject: '⚠️ Meta Dashboard fejlede',
      body: `Dashboard-kørsel fejlede:\n\n${err.message}\n\nSheet: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`
    });
  } catch (e) {
    // Hvis email også fejler, så har vi gjort hvad vi kan
  }
}
